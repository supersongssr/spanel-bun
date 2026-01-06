# 🚀 SPanel 快速参考

## 一键部署命令

```bash
# 1. 构建前端(已完成)
cd /root/git/spanel-bun/frontend && ./build-local.sh

# 2. 部署前端
cd /root/git/spanel-bun && sudo ./deploy-web.sh

# 3. 配置Nginx
sudo ./install-nginx-config.sh

# 4. 启动后端
cd backend && bun install && bun run dev
```

## 🌐 访问地址

```
https://test-spanel-bun.freessr.bid/user/login.html  # 登录
https://test-spanel-bun.freessr.bid/user/index.html  # 用户仪表板
https://test-spanel-bun.freessr.bid/admin/index.html # 管理后台
https://test-spanel-bun.freessr.bid/api/health       # API健康检查
```

## 📁 关键文件位置

```
/var/www/test-spanel-bun                    # 前端软链接
/etc/nginx/conf.d/test-spanel-bun.*.conf     # Nginx配置
/etc/ssl/freessr.bid.*                       # SSL证书
/root/git/spanel-bun/backend/src/index.ts   # 后端入口
/root/git/spanel-bun/frontend/dist/         # 前端构建输出
```

## 🔧 常用命令

```bash
# 查看Nginx状态
sudo systemctl status nginx

# 测试Nginx配置
sudo nginx -t

# 重载Nginx
sudo systemctl reload nginx

# 查看Nginx日志
sudo tail -f /var/log/nginx/test-spanel-bun-error.log

# 查看后端日志
pm2 logs spanel-api
# 或
journalctl -u spanel-api -f

# 重启后端
pm2 restart spanel-api

# 数据库迁移
cd backend && bun run prisma:migrate

# 查看数据库
bun run prisma:studio
```

## 🐛 快速修复

### 前端404
```bash
sudo ls -la /var/www/test-spanel-bun
sudo chmod -R 755 /root/git/spanel-bun/frontend/dist
```

### API 502
```bash
# 检查后端
pm2 status
# 或
ps aux | grep bun

# 重启后端
pm2 restart spanel-api
```

### Nginx错误
```bash
sudo nginx -t
sudo tail -50 /var/log/nginx/error.log
```

## 📊 项目结构速览

```
test-spanel-bun.freessr.bid
├── /api/*     → Bun后端 (3000端口)
├── /user/*    → 用户端静态页面
└── /admin/*   → 管理端静态页面
```

## 🎯 开发流程

1. **修改代码** → `backend/` 或 `frontend/`
2. **构建前端** → `cd frontend && ./build-local.sh`
3. **重启后端** → `pm2 restart spanel-api`
4. **测试** → 浏览器访问或 Playwright MCP

## 📚 文档索引

- `README.md` - 项目概述
- `DEPLOY.md` - 部署说明
- `docs/PLAN.md` - 完整实施计划
- `docs/QUICKSTART.md` - 快速开始
- `docs/DEPLOYMENT.md` - 详细部署文档
- `PROJECT_SUMMARY.md` - 项目总结
