# 🚀 完整部署指南

## 📋 当前状态

根据验证脚本的结果:

- ✅ 前端静态文件已生成
- ✅ 软链接已创建
- ✅ Nginx 正在运行
- ❌ Nginx 配置文件未安装到 `/etc/nginx/conf.d/`
- ❌ SSL 证书不存在
- ⚠️ 后端服务未启动

---

## 🎯 完整部署步骤

### 步骤 1: DNS 解析 (首先做这个!)

在你的 DNS 服务商添加 A 记录:

```
类型: A
主机记录: test-spanel-bun
记录值: <你的服务器公网IP>
TTL: 600
```

**等待 DNS 生效** (通常 5-10 分钟)

验证 DNS:
```bash
dig test-spanel-bun.freessr.bid
# 或
nslookup test-spanel-bun.freessr.bid
```

### 步骤 2: 安装 Nginx 配置

```bash
cd /root/git/spanel-bun
sudo ./scripts/install-nginx-config.sh
```

如果脚本提示找不到配置文件,手动复制:
```bash
sudo cp /root/git/spanel-bun/nginx/test-spanel-bun.freessr.bid.conf /etc/nginx/conf.d/
sudo nginx -t
sudo systemctl reload nginx
```

### 步骤 3: 获取 SSL 证书 (推荐使用 Let's Encrypt)

#### 方式 1: 使用 Certbot (推荐)

```bash
# 安装 Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d test-spanel-bun.freessr.bid

# Certbot 会自动:
# 1. 获取免费 SSL 证书
# 2. 修改 Nginx 配置
# 3. 设置自动续期
```

#### 方式 2: 使用已有证书

如果你已有 SSL 证书:

```bash
# 复制证书到指定位置
sudo cp /path/to/your/cert.crt /etc/ssl/freessr.bid.crt
sudo cp /path/to/your/cert.key /etc/ssl/freessr.bid.key

# 设置权限
sudo chmod 644 /etc/ssl/freessr.bid.crt
sudo chmod 600 /etc/ssl/freessr.bid.key
```

#### 方式 3: 临时使用自签名证书 (仅测试)

```bash
# 生成自签名证书
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/freessr.bid.key \
  -out /etc/ssl/freessr.bid.crt \
  -subj "/CN=test-spanel-bun.freessr.bid"

# 设置权限
sudo chmod 644 /etc/ssl/freessr.bid.crt
sudo chmod 600 /etc/ssl/freessr.bid.key
```

⚠️ **注意**: 自签名证书会导致浏览器显示安全警告,仅用于测试!

### 步骤 4: 重载 Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 步骤 5: 启动后端服务

```bash
cd /root/git/spanel-bun/backend

# 安装依赖
bun install

# 配置环境变量
cp .env.example .env
nano .env  # 编辑数据库等配置

# 生成 Prisma Client
bun run prisma:generate

# 运行数据库迁移
bun run prisma:migrate

# 启动开发服务器
bun run dev

# 或使用 PM2 (生产环境)
pm2 start bun --name spanel-api -- run src/index.ts
```

### 步骤 6: 验证部署

运行验证脚本:
```bash
cd /root/git/spanel-bun
./scripts/verify-deployment.sh
```

### 步骤 7: 浏览器测试

访问以下 URL:

1. ✅ https://test-spanel-bun.freessr.bid/user/login.html
2. ✅ https://test-spanel-bun.freessr.bid/user/index.html
3. ✅ https://test-spanel-bun.freessr.bid/user/register.html
4. ✅ https://test-spanel-bun.freessr.bid/admin/index.html
5. ✅ https://test-spanel-bun.freessr.bid/api/health

---

## 🔧 快速参考

### 常用命令

```bash
# 验证部署
./scripts/verify-deployment.sh

# 重新构建前端
cd frontend && ./scripts/build-public.sh

# 重新部署前端
cd .. && sudo ./scripts/deploy-public.sh

# 重启 Nginx
sudo systemctl restart nginx

# 重启后端
pm2 restart spanel-api
# 或
cd backend && bun run dev

# 查看 Nginx 日志
sudo tail -f /var/log/nginx/test-spanel-bun.freessr.bid-error.log

# 查看后端日志
pm2 logs spanel-api
```

### 端口检查

```bash
# 检查端口占用
sudo netstat -tlnp | grep :3000  # 后端
sudo netstat -tlnp | grep :443   # HTTPS
sudo netstat -tlnp | grep :80    # HTTP
```

---

## ⚠️ 常见问题

### 1. DNS 未生效

**症状**: 浏览器显示 "无法访问此网站"

**解决**:
```bash
# 检查 DNS 解析
dig test-spanel-bun.freessr.bid

# 如果未解析,等待 5-10 分钟后重试
# 或检查本地 DNS 缓存:
sudo systemd-resolve --flush-caches
```

### 2. SSL 证书错误

**症状**: 浏览器显示 "不安全的连接"

**解决**:
```bash
# 使用 Let's Encrypt 获取免费证书
sudo certbot --nginx -d test-spanel-bun.freessr.bid

# 或检查证书是否存在
ls -la /etc/ssl/freessr.bid.*
```

### 3. 502 Bad Gateway

**症状**: API 请求返回 502 错误

**解决**:
```bash
# 检查后端是否运行
pm2 status
# 或
ps aux | grep bun

# 重启后端
pm2 restart spanel-api

# 检查端口
sudo netstat -tlnp | grep :3000
```

### 4. 404 Not Found

**症状**: 页面显示 404

**解决**:
```bash
# 检查软链接
ls -la /var/www/test-spanel-bun.freessr.bid

# 重新部署前端
sudo ./scripts/deploy-public.sh

# 检查 Nginx 配置
sudo nginx -t
```

---

## 🎉 完成检查清单

部署完成后,确认以下所有项都已完成:

- [ ] DNS 已解析到服务器 IP
- [ ] Nginx 配置已安装
- [ ] SSL 证书已安装
- [ ] 前端已部署到 `/var/www/`
- [ ] 后端服务正在运行
- [ ] 可以访问登录页面
- [ ] 可以访问 API 健康检查
- [ ] Nginx 日志无错误

---

## 📞 下一步

部署完成后:

1. **使用 Playwright MCP 测试**
   - 测试登录流程
   - 检查页面渲染
   - 验证 API 调用

2. **监控日志**
   ```bash
   # Nginx 访问日志
   sudo tail -f /var/log/nginx/test-spanel-bun.freessr.bid-access.log

   # Nginx 错误日志
   sudo tail -f /var/log/nginx/test-spanel-bun.freessr.bid-error.log

   # 后端日志
   pm2 logs spanel-api
   ```

3. **开始开发**
   - 实现后端 API
   - 开发前端 Vue 组件
   - 完善功能模块

---

**祝你部署顺利!** 🚀
