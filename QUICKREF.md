# ⚡ 快速参考 - SPanel 容器化部署

## 🚀 一键测试

```bash
# API 测试
bun run backend/tests/api.test.ts

# 容器管理
./scripts/backend-container.sh status
```

---

## 📊 容器状态

```
playwright-mcp-server: 10.89.1.12:8931 ✅
spanel-backend:        10.89.1.13:3000 ✅
```

---

## 🌐 访问方式

### 宿主机
- http://localhost:3000

### Playwright 容器
- http://10.89.1.13:3000
- http://spanel-backend:3000

### 外部 (Nginx)
- https://test-spanel-bun.freessr.bid/api/*

---

## 🔧 常用命令

```bash
# 查看容器状态
podman ps | grep spanel

# 查看日志
podman logs -f spanel-backend

# 重启容器
podman restart spanel-backend

# 进入容器
podman exec -it spanel-backend sh

# 重新构建
cd backend && podman build -t spanel-backend:latest -f Dockerfile .

# 测试 API
bun run backend/tests/api.test.ts

# 从 Playwright 测试连接
podman exec playwright-mcp-server wget -q -O- http://10.89.1.13:3000/api/health
```

---

## 📝 重要文件

- `backend/Dockerfile` - 镜像构建
- `backend/tests/api.test.ts` - API 测试
- `scripts/backend-container.sh` - 管理脚本
- `docker-compose.yml` - 容器配置

---

## ✅ 测试结果

```
🧪 SPanel API 测试
✓ 首页响应正常
✓ 健康检查通过
✓ 登录端点可访问
✓ 用户端点可访问
✓ 404 处理正确

总计: 5/5 通过 🎉
```

---

**容器化部署完成！可以使用 Playwright MCP 进行测试了！**
