# 🚀 SPanel 部署指南

## ✅ 已完成的工作

### 1. 前端静态文件已生成 ✅

位置: `/root/git/spanel-bun/frontend/dist/`

包含以下页面:
- ✅ `user/login.html` - 用户登录页
- ✅ `user/index.html` - 用户仪表板
- ✅ `user/register.html` - 用户注册页
- ✅ `admin/index.html` - 管理后台

### 2. Nginx 配置已创建 ✅

位置: `/root/git/spanel-bun/nginx/test-spanel-bun.freessr.bid.conf`

配置特点:
- ✅ SSL/TLS 配置 (证书路径: `/etc/ssl/freessr.bid.*`)
- ✅ API 反向代理到 Bun 后端 (`localhost:3000`)
- ✅ 静态文件服务 (`/user/*` 和 `/admin/*`)
- ✅ 安全头配置 (HSTS, X-Frame-Options 等)
- ✅ 静态资源缓存优化

### 3. 部署脚本已创建 ✅

- ✅ `deploy-web.sh` - 部署前端(创建软链接)
- ✅ `install-nginx-config.sh` - 安装 Nginx 配置
- ✅ `frontend/build-local.sh` - 构建前端静态文件

## 📋 部署步骤

### 第一步: 构建前端（已完成）

```bash
cd /root/git/spanel-bun/frontend
./build-local.sh
```

✅ **状态**: 已完成

### 第二步: 部署前端到 Web 目录

```bash
cd /root/git/spanel-bun
sudo ./deploy-web.sh
```

这个脚本会:
1. 创建软链接: `/var/www/test-spanel-bun` → `/root/git/spanel-bun/frontend/dist`
2. 设置正确的文件权限
3. 测试并重载 Nginx

### 第三步: 安装 Nginx 配置

```bash
cd /root/git/spanel-bun
sudo ./install-nginx-config.sh
```

这个脚本会:
1. 复制 Nginx 配置到 `/etc/nginx/conf.d/`
2. 检查 SSL 证书是否存在
3. 测试 Nginx 配置
4. 重载 Nginx 服务

### 第四步: 启动后端服务

```bash
cd /root/git/spanel-bun/backend

# 安装依赖
bun install

# 配置环境变量
cp .env.example .env
nano .env  # 编辑配置

# 生成 Prisma Client
bun run prisma:generate

# 运行数据库迁移
bun run prisma:migrate

# 启动开发服务器
bun run dev

# 或使用 PM2 (生产环境推荐)
pm2 start bun --name spanel-api -- run src/index.ts
```

## 🌐 访问地址

部署完成后,可以通过以下地址访问:

- **用户登录**: https://test-spanel-bun.freessr.bid/user/login.html
- **用户仪表板**: https://test-spanel-bun.freessr.bid/user/index.html
- **用户注册**: https://test-spanel-bun.freessr.bid/user/register.html
- **管理后台**: https://test-spanel-bun.freessr.bid/admin/index.html
- **API 接口**: https://test-spanel-bun.freessr.bid/api/
- **健康检查**: https://test-spanel-bun.freessr.bid/api/health

## 📁 文件结构

```
/var/www/test-spanel-bun          # 软链接指向前端 dist 目录
├── user/                          # 用户端页面
│   ├── login.html                 # 登录页
│   ├── index.html                 # 仪表板
│   └── register.html              # 注册页
└── admin/                         # 管理端页面
    └── index.html                 # 管理后台

/etc/nginx/conf.d/
└── test-spanel-bun.freessr.bid.conf  # Nginx 配置文件

/etc/ssl/
├── freessr.bid.crt                # SSL 证书
└── freessr.bid.key                # SSL 私钥
```

## 🔧 手动部署步骤

如果你想手动部署而不使用脚本:

### 1. 创建软链接

```bash
sudo ln -s /root/git/spanel-bun/frontend/dist /var/www/test-spanel-bun
sudo chmod -R 755 /root/git/spanel-bun/frontend/dist
sudo chown -R www-data:www-data /root/git/spanel-bun/frontend/dist
```

### 2. 安装 Nginx 配置

```bash
sudo cp /root/git/spanel-bun/nginx/test-spanel-bun.freessr.bid.conf /etc/nginx/conf.d/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. 验证部署

```bash
# 检查软链接
ls -la /var/www/test-spanel-bun

# 检查 Nginx 配置
sudo nginx -t

# 检查 Nginx 状态
sudo systemctl status nginx

# 测试 API
curl https://test-spanel-bun.freessr.bid/api/health
```

## 📊 架构说明

```
用户浏览器
    ↓
test-spanel-bun.freessr.bid
    ↓
Nginx (443)
    ├─→ /api/*          → 反向代理 → Bun 容器 (3000端口)
    ├─→ /user/*         → 静态文件 → /var/www/test-spanel-bun/user/
    ├─→ /admin/*        → 静态文件 → /var/www/test-spanel-bun/admin/
    └─→ /*              → 重定向到 /user/index.html
```

## 🛠️ 故障排查

### 前端页面 404

```bash
# 检查软链接
ls -la /var/www/test-spanel-bun

# 检查文件权限
ls -la /root/git/spanel-bun/frontend/dist

# 查看 Nginx 日志
sudo tail -f /var/log/nginx/test-spanel-bun-error.log
```

### API 请求 502

```bash
# 检查后端服务
pm2 status spanel-api
# 或
ps aux | grep bun

# 检查端口
sudo netstat -tlnp | grep 3000

# 测试后端
curl http://localhost:3000/health
```

### SSL 证书错误

```bash
# 检查证书文件
ls -la /etc/ssl/freessr.bid.*

# 验证证书
openssl x509 -in /etc/ssl/freessr.bid.crt -text -noout
```

## 📚 相关文档

- [完整部署文档](./docs/DEPLOYMENT.md)
- [快速开始指南](./docs/QUICKSTART.md)
- [项目实施计划](./docs/PLAN.md)

## ✨ 下一步

1. **执行部署脚本**:
   ```bash
   sudo ./deploy-web.sh
   sudo ./install-nginx-config.sh
   ```

2. **启动后端服务**:
   ```bash
   cd backend && bun run dev
   ```

3. **访问网站测试**:
   - 打开浏览器访问 https://test-spanel-bun.freessr.bid

4. **使用 Playwright MCP 进行网页测试**:
   - 可以测试登录流程
   - 检查页面渲染
   - 验证 API 调用

祝部署顺利! 🎉
