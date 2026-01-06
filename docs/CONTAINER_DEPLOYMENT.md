# 🎉 Bun + Playwright 容器化部署完成

## ✅ 部署成功！

SPanel 后端 (Bun) 已成功容器化，并与 Playwright 在同一 `main` 网络中运行。

---

## 📊 容器状态

### 运行中的容器

| 容器名 | 镜像 | IP地址 | 端口 | 状态 |
|--------|------|--------|------|------|
| playwright-mcp-server | playwright-mcp:latest | 10.89.1.12 | 8931 | ✅ Running |
| spanel-backend | spanel-backend:latest | 10.89.1.13 | 3000 | ✅ Running |

### 网络

```
main 网桥网络 (10.89.1.0/24)
├── playwright-mcp-server (10.89.1.12)
└── spanel-backend (10.89.1.13)
```

---

## 🌐 访问地址

### 从宿主机访问
- **API**: http://localhost:3000
- **健康检查**: http://localhost:3000/api/health

### 从 Playwright 容器访问
- **API**: http://10.89.1.13:3000
- **或容器名**: http://spanel-backend:3000

### 从外部访问 (Nginx)
- **API**: https://test-spanel-bun.freessr.bid/api/*
- **前端**: https://test-spanel-bun.freessr.bid/user/*

---

## 🔧 容器管理命令

### 查看容器状态
```bash
podman ps
```

### 查看容器日志
```bash
# 后端日志
podman logs -f spanel-backend

# 最近 100 行
podman logs --tail 100 spanel-backend
```

### 重启容器
```bash
podman restart spanel-backend
```

### 停止容器
```bash
podman stop spanel-backend
```

### 启动容器
```bash
podman start spanel-backend
```

### 进入容器 (调试)
```bash
podman exec -it spanel-backend sh
```

### 查看容器网络
```bash
podman network inspect main
```

---

## 🔄 更新流程

### 更新后端代码

1. 修改代码
2. 重新构建镜像:
   ```bash
   cd /root/git/spanel-bun/backend
   podman build -t spanel-backend:latest -f Dockerfile .
   ```
3. 重启容器:
   ```bash
   podman restart spanel-backend
   ```

### 重新创建容器

如果需要更新环境变量或其他配置：

```bash
# 1. 停止并删除旧容器
podman stop spanel-backend
podman rm spanel-backend

# 2. 重新运行
podman run -d \
  --name spanel-backend \
  --network main \
  -p 3000:3000 \
  -e DATABASE_URL="mysql://spanel:spanel_password@host.containers.internal:3306/spanel" \
  -e REDIS_URL="redis://host.containers.internal:6379" \
  -e JWT_SECRET="spanel-jwt-secret-key-2024" \
  -e JWT_EXPIRES_IN="7d" \
  -e PORT=3000 \
  -e NODE_ENV=production \
  -e CORS_ORIGIN="https://test-spanel-bun.freessr.bid" \
  --restart unless-stopped \
  localhost/spanel-backend:latest
```

---

## 🎯 Playwright MCP 使用

### 配置

Playwright MCP 已配置在 `/root/.claude/settings.json`:

```json
"mcpServers": {
  "playwright": {
    "command": "podman",
    "args": [
      "exec",
      "-i",
      "playwright-mcp-server",
      "playwright-mcp-server"
    ]
  }
}
```

### 测试连接

从 Playwright 容器测试访问后端：

```bash
# 使用 IP
podman exec playwright-mcp-server wget -q -O- http://10.89.1.13:3000/api/health

# 使用容器名 (如果 DNS 解析可用)
podman exec playwright-mcp-server wget -q -O- http://spanel-backend:3000/api/health
```

**返回结果**:
```json
{"status":"healthy","timestamp":"2026-01-06T10:18:54.965Z"}
```

### Playwright 测试示例

现在 Playwright 可以直接访问容器内的后端服务进行测试：

```javascript
// 在 Playwright 中测试 API
const response = await page.request.get('http://10.89.1.13:3000/api/health');
const data = await response.json();
console.log(data);
// { status: 'healthy', timestamp: '...' }

// 测试前端 + 后端完整流程
await page.goto('https://test-spanel-bun.freessr.bid/user/login.html');
await page.fill('#email', 'test@example.com');
await page.fill('#password', 'password123');
await page.click('button[type="submit"]');
// API 请求会发送到 https://test-spanel-bun.freessr.bid/api/*
// Nginx 反向代理到容器中的 Bun (localhost:3000)
```

---

## 🏗️ 架构说明

### 容器通信

```
┌─────────────────────────────────────────┐
│         main 网络 (10.89.1.0/24)        │
├─────────────────────────────────────────┤
│                                          │
│  ┌─────────────────────────────────┐   │
│  │  playwright-mcp-server          │   │
│  │  IP: 10.89.1.12                 │   │
│  │  Port: 8931                     │   │
│  │                                  │   │
│  │  可以直接访问:                  │   │
│  │  - http://10.89.1.13:3000       │   │
│  │  - http://spanel-backend:3000  │   │
│  └─────────────────────────────────┘   │
│                ↕                       │
│  ┌─────────────────────────────────┐   │
│  │  spanel-backend (Bun)           │   │
│  │  IP: 10.89.1.13                 │   │
│  │  Port: 3000 (exposed to host)   │   │
│  │                                  │   │
│  │  API Endpoints:                 │   │
│  │  - /api/health                  │   │
│  │  - /api/auth/*                  │   │
│  │  - /api/user/*                  │   │
│  │  - /api/node/*                  │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
            ↕ (port 3000)
┌─────────────────────────────────────────┐
│           宿主机 (localhost)            │
├─────────────────────────────────────────┤
│                                          │
│  ┌─────────────────────────────────┐   │
│  │  Nginx (443)                    │   │
│  │                                  │   │
│  │  https://test-spanel-bun...      │   │
│  │    ↓                             │   │
│  │  /api/* → localhost:3000       │   │
│  │  /user/* → /var/www/...         │   │
│  └─────────────────────────────────┘   │
│                                          │
│  ┌─────────────────────────────────┐   │
│  │  MySQL (容器)                   │   │
│  │  Port: 3306                     │   │
│  │  via: host.containers.internal  │   │
│  └─────────────────────────────────┘   │
│                                          │
│  ┌─────────────────────────────────┐   │
│  │  Redis (容器)                   │   │
│  │  Port: 6379                     │   │
│  │  via: host.containers.internal  │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## 🔍 故障排查

### 容器无法启动

```bash
# 查看日志
podman logs spanel-backend

# 检查镜像
podman images | grep spanel-backend

# 重新构建
cd /root/git/spanel-bun/backend
podman build -t spanel-backend:latest -f Dockerfile .
```

### 网络连接问题

```bash
# 检查容器网络
podman network inspect main

# 从容器内部测试
podman exec spanel-backend wget -q -O- http://localhost:3000/api/health

# 测试 DNS 解析
podman exec spanel-backend nslookup playwright-mcp-server
```

### Playwright 无法访问后端

```bash
# 确认两个容器在同一网络
podman inspect playwright-mcp-server | grep -A 5 "Networks"
podman inspect spanel-backend | grep -A 5 "Networks"

# 测试连接
podman exec playwright-mcp-server ping -c 3 10.89.1.13

# 或使用容器名
podman exec playwright-mcp-server ping -c 3 spanel-backend
```

---

## 📝 下一步

1. **使用 Playwright MCP 进行 E2E 测试**
   - 测试登录流程
   - 验证 API 调用
   - 检查页面渲染

2. **实现后端 API 逻辑**
   - 用户认证 (JWT)
   - 数据库操作 (Prisma)
   - 业务逻辑

3. **完善前端功能**
   - Vue 组件开发
   - 状态管理
   - API 集成

---

## 🎉 总结

### ✅ 已完成

1. ✅ 停止宿主机 Bun 服务
2. ✅ 创建 Dockerfile (基于 oven/bun:1.3.5-alpine)
3. ✅ 配置 docker-compose.yml
4. ✅ 构建后端镜像 (264 MB)
5. ✅ 启动后端容器
6. ✅ 连接到 main 网络 (与 Playwright 同网络)
7. ✅ 验证 Playwright 可以访问后端

### 🚀 优势

- **环境隔离** - Bun 和 Playwright 都在容器中
- **直接访问** - 同一网络，可以直接通信
- **易于调试** - Playwright 可以直接测试容器内的服务
- **可移植** - 完全容器化，易于迁移

### 📚 相关文档

- [HOST_SETUP_COMPLETE.md](./HOST_SETUP_COMPLETE.md)
- [DEPLOYMENT_COMPLETE.md](./DEPLOYMENT_COMPLETE.md)
- [docker-compose.yml](../docker-compose.yml)

---

**容器化部署完成！现在可以使用 Playwright MCP 进行测试了！** 🎉
