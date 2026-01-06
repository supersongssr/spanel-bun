# SPanel 部署文档

## 📋 概述

本文档说明如何将 SPanel 前后端分离项目部署到生产环境。

## 🏗️ 架构说明

```
test-spanel-bun.freessr.bid (单一域名)
│
├── /api/*              → Nginx 反向代理 → Bun 容器 (端口 3000)
│   ├── /api/auth/*
│   ├── /api/user/*
│   └── /api/admin/*
│
├── /user/*             → Nginx 静态文件服务 → /var/www/test-spanel-bun/user/
│   ├── /user/index.html
│   ├── /user/login.html
│   └── /user/register.html
│
└── /admin/*            → Nginx 静态文件服务 → /var/www/test-spanel-bun/admin/
    └── /admin/index.html
```

## 📁 文件结构

### 前端静态文件
```
/root/git/spanel-bun/frontend/dist/
├── user/
│   ├── index.html       # 用户仪表板
│   ├── login.html       # 登录页
│   └── register.html    # 注册页
└── admin/
    └── index.html       # 管理后台
```

### 软链接到 Web 目录
```bash
/var/www/test-spanel-bun -> /root/git/spanel-bun/frontend/dist
```

### Nginx 配置
```bash
/etc/nginx/conf.d/test-spanel-bun.freessr.bid.conf
```

### SSL 证书
```bash
/etc/ssl/freessr.bid.crt    # SSL 证书
/etc/ssl/freessr.bid.key    # SSL 私钥
```

## 🚀 快速部署

### 方法1: 使用自动化脚本（推荐）

#### 1. 构建前端静态文件
```bash
cd /root/git/spanel-bun/frontend
./build-local.sh
```

#### 2. 部署前端（创建软链接）
```bash
cd /root/git/spanel-bun
sudo ./deploy-web.sh
```

#### 3. 安装 Nginx 配置
```bash
cd /root/git/spanel-bun
sudo ./install-nginx-config.sh
```

#### 4. 启动后端服务
```bash
cd /root/git/spanel-bun/backend
bun install
bun run prisma:generate
bun run prisma:migrate
bun run dev
# 或使用 PM2
pm2 start bun --name spanel-api -- run src/index.ts
```

完成! 访问 https://test-spanel-bun.freessr.bid

---

### 方法2: 手动部署

#### 步骤 1: 构建前端
```bash
cd /root/git/spanel-bun/frontend

# 构建静态文件
./build-local.sh

# 检查构建结果
ls -la dist/
```

#### 步骤 2: 创建软链接
```bash
# 创建软链接
sudo ln -s /root/git/spanel-bun/frontend/dist /var/www/test-spanel-bun

# 设置权限
sudo chmod -R 755 /root/git/spanel-bun/frontend/dist
sudo chown -R www-data:www-data /root/git/spanel-bun/frontend/dist

# 验证软链接
ls -la /var/www/ | grep test-spanel-bun
```

#### 步骤 3: 配置 Nginx
```bash
# 复制 Nginx 配置
sudo cp /root/git/spanel-bun/nginx/test-spanel-bun.freessr.bid.conf /etc/nginx/conf.d/

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

#### 步骤 4: 启动后端
```bash
cd /root/git/spanel-bun/backend

# 安装依赖
bun install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 生成 Prisma Client
bun run prisma:generate

# 运行数据库迁移
bun run prisma:migrate

# 启动开发服务器
bun run dev
```

---

## 🔧 配置说明

### Nginx 配置详解

Nginx 配置文件位于 `/etc/nginx/conf.d/test-spanel-bun.freessr.bid.conf`

主要配置项:

1. **SSL/TLS**
   - 证书路径: `/etc/ssl/freessr.bid.crt`
   - 私钥路径: `/etc/ssl/freessr.bid.key`
   - 支持 TLS 1.2 和 1.3

2. **API 反向代理**
   - 路径: `/api/*`
   - 后端: `http://127.0.0.1:3000/`
   - 支持 WebSocket (升级连接)

3. **静态文件服务**
   - 用户端: `/user/*` → `/var/www/test-spanel-bun/user/`
   - 管理端: `/admin/*` → `/var/www/test-spanel-bun/admin/`
   - 静态资源缓存 1 年

4. **安全头**
   - HSTS: 63072000 秒 (2 年)
   - X-Frame-Options: SAMEORIGIN
   - X-Content-Type-Options: nosniff
   - X-XSS-Protection: 1; mode=block

### 后端环境变量

编辑 `backend/.env`:

```bash
# 数据库
DATABASE_URL="mysql://spanel:password@localhost:3306/spanel"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-secret-key-change-this"
JWT_EXPIRES_IN="7d"

# 服务器
PORT=3000
NODE_ENV=production

# Mu API
MU_KEY="your-mu-api-key"
```

## 📊 验证部署

### 1. 检查前端文件
```bash
ls -la /var/www/test-spanel-bun/
# 应该看到:
# user/ -> 登录页、仪表板等
# admin/ -> 管理后台
```

### 2. 检查 Nginx 配置
```bash
# 测试配置
sudo nginx -t

# 查看 Nginx 状态
sudo systemctl status nginx

# 查看错误日志
sudo tail -f /var/log/nginx/test-spanel-bun-error.log
```

### 3. 检查后端服务
```bash
# 检查 Bun 进程
ps aux | grep bun

# 检查端口占用
netstat -tlnp | grep 3000

# 测试 API
curl http://localhost:3000/health
```

### 4. 浏览器测试

访问以下 URL:

- ✅ https://test-spanel-bun.freessr.bid/user/login.html
- ✅ https://test-spanel-bun.freessr.bid/user/index.html
- ✅ https://test-spanel-bun.freessr.bid/admin/index.html
- ✅ https://test-spanel-bun.freessr.bid/api/health

## 🔄 更新部署

### 更新前端
```bash
cd /root/git/spanel-bun/frontend
./build-local.sh
# 软链接会自动指向新的 dist 目录
```

### 更新 Nginx 配置
```bash
# 编辑配置文件
sudo nano /etc/nginx/conf.d/test-spanel-bun.freessr.bid.conf

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

### 更新后端
```bash
cd /root/git/spanel-bun/backend
git pull
bun install
pm2 restart spanel-api
# 或
bun run dev
```

## 🐛 故障排查

### 前端页面无法访问

**症状**: 浏览器显示 404 或 403 错误

**解决**:
```bash
# 检查软链接
ls -la /var/www/test-spanel-bun

# 检查文件权限
ls -la /root/git/spanel-bun/frontend/dist

# 修复权限
sudo chmod -R 755 /root/git/spanel-bun/frontend/dist
sudo chown -R www-data:www-data /root/git/spanel-bun/frontend/dist
```

### API 请求失败

**症状**: 前端页面加载但 API 返回 502 错误

**解决**:
```bash
# 检查后端服务
pm2 status
# 或
ps aux | grep bun

# 检查端口
netstat -tlnp | grep 3000

# 查看后端日志
pm2 logs spanel-api
# 或
journalctl -u spanel-api -f
```

### SSL 证书错误

**症状**: 浏览器显示证书无效

**解决**:
```bash
# 检查证书文件
ls -la /etc/ssl/freessr.bid.*

# 验证证书
openssl x509 -in /etc/ssl/freessr.bid.crt -text -noout

# 检查 Nginx 配置中的证书路径
sudo grep ssl_certificate /etc/nginx/conf.d/test-spanel-bun.freessr.bid.conf
```

### Nginx 配置测试失败

**症状**: `nginx -t` 报错

**解决**:
```bash
# 查看详细错误
sudo nginx -t

# 检查配置文件语法
sudo nginx -T | grep -A 20 test-spanel-bun

# 查看错误日志
sudo tail -50 /var/log/nginx/error.log
```

## 📈 性能优化

### 前端优化

1. **启用 Gzip 压缩** (已在 Nginx 配置中)
2. **静态资源缓存** (已配置 1 年缓存)
3. **HTTP/2** (已启用)
4. **CDN** (可选,将静态文件上传到 CDN)

### 后端优化

1. **使用 PM2 集群模式**
   ```bash
   pm2 start bun --name spanel-api -i 4 -- run src/index.ts
   ```

2. **配置 Redis 缓存**
   ```bash
   # 在 backend/.env 中配置
   REDIS_URL="redis://localhost:6379"
   ```

3. **数据库连接池**
   - Prisma 自动管理连接池
   - 在 `.env` 中配置: `DATABASE_POOL_SIZE=10`

### Nginx 优化

1. **启用缓存**
   ```nginx
   proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=1g;
   ```

2. **调整 Worker 进程数**
   ```nginx
   worker_processes auto;
   ```

## 🔒 安全建议

1. **定期更新 SSL 证书**
   ```bash
   # 使用 Let's Encrypt
   sudo certbot renew
   ```

2. **配置防火墙**
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

3. **限制 API 请求频率**
   - 在后端实现速率限制中间件

4. **定期备份数据库**
   ```bash
   mysqldump -u root -p spanel > backup_$(date +%Y%m%d).sql
   ```

5. **监控日志**
   ```bash
   # 设置日志轮转
   sudo logrotate /etc/logrotate.d/nginx
   ```

## 📞 支持

如有问题,请查看:
- 项目文档: `/root/git/spanel-bun/docs/`
- Nginx 日志: `/var/log/nginx/test-spanel-bun-*.log`
- 后端日志: `pm2 logs spanel-api`
