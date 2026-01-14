# SPanel Bun - 前后端分离版本

## 项目概述

SPanel 的现代化重构版本，采用完全的前后端分离架构。

- **前端**: Vue 3 + Vite（多页面MPA模式）→ 生成纯静态HTML/CSS/JS
- **后端**: Bun + TypeScript + Elysia.js → RESTful API
- **数据库**: MySQL/MariaDB + Prisma ORM
- **部署**: Nginx 静态文件服务 + Bun API 服务

## 技术栈

### 后端
- **运行时**: Bun (高性能 JavaScript 运行时)
- **框架**: Elysia.js v0 (快速、类型安全的 Web 框架)
- **语言**: TypeScript
- **ORM**: Prisma
- **认证**: JWT (@elysiajs/jwt)
- **API 文档**: Swagger (@elysiajs/swagger)
- **CORS**: @elysiajs/cors
- **缓存**: Redis

### 前端
- **框架**: Vue 3 (Composition API + `<script setup>`)
- **构建工具**: Vite 5.x
- **语言**: TypeScript
- **UI库**: Element Plus
- **状态管理**: Pinia
- **HTTP客户端**: Axios

## 项目结构

```
spanel-bun/
├── backend/                    # 后端项目
│   ├── src/
│   │   ├── controllers/       # 控制器层
│   │   ├── services/          # 业务逻辑层
│   │   ├── middleware/        # 中间件
│   │   ├── utils/             # 工具函数
│   │   ├── types/             # TypeScript类型
│   │   └── index.ts           # 入口文件
│   ├── prisma/
│   │   └── schema.prisma      # 数据库Schema
│   ├── tests/                 # 测试文件
│   ├── docker-compose.yml
│   └── package.json
│
├── frontend/                   # 前端项目
│   ├── src/
│   │   ├── pages/             # 多页面入口
│   │   │   ├── index/         # 首页
│   │   │   ├── login/         # 登录页
│   │   │   ├── register/      # 注册页
│   │   │   ├── node/          # 节点页
│   │   │   ├── shop/          # 商店页
│   │   │   ├── ticket/        # 工单页
│   │   │   ├── profile/       # 资料页
│   │   │   └── admin/         # 管理端
│   │   ├── shared/            # 共享代码
│   │   │   ├── api/           # API客户端
│   │   │   ├── composables/   # 组合式函数
│   │   │   ├── stores/        # 状态管理
│   │   │   ├── types/         # TypeScript类型
│   │   │   └── utils/         # 工具函数
│   │   └── assets/            # 静态资源
│   ├── public/                # 🔥 构建输出的静态HTML
│   │   ├── user/
│   │   │   ├── login.html
│   │   │   ├── index.html
│   │   │   └── register.html
│   │   └── admin/
│   │       └── index.html
│   ├── scripts/               # 前端构建脚本
│   │   └── build-public.sh    # 构建到 public/
│   ├── public/                # 原始静态资源
│   ├── vite.config.ts
│   └── package.json
│
├── scripts/                    # 🔥 部署和构建脚本
│   ├── build-local.sh         # 构建前端静态文件
│   ├── deploy-public.sh       # 部署前端到 /var/www/
│   ├── deploy-web.sh          # 旧版部署脚本
│   ├── install-nginx-config.sh # 安装 Nginx 配置
│   ├── start.sh               # 启动开发环境
│   └── test-spanel-bun.freessr.bid.conf # Nginx配置
│
├── docs/                       # 文档
│   ├── PLAN.md                # 完整实施方案
│   ├── QUICKSTART.md          # 快速开始指南
│   ├── DEPLOYMENT.md          # 详细部署文档
│   ├── DEPLOY.md              # 部署说明
│   ├── PROJECT_SUMMARY.md     # 项目总结
│   ├── PROJECT_STATUS.md      # 项目状态
│   └── QUICKREF.md            # 快速参考
│
├── nginx/                      # Nginx 配置源文件
├── podman/                     # Podman/Docker配置
├── docker-compose.yml          # Docker Compose 配置
├── .env.example                # 环境变量模板
└── README.md
```

## 快速开始

### 环境要求
- Bun >= 1.0.0
- Node.js >= 18.0.0 (用于前端开发)
- MySQL >= 8.0 / MariaDB >= 10.5
- Redis >= 7.0
- Nginx (生产环境)

### 快速部署

#### 环境要求
- Bun >= 1.0.0
- Redis >= 7.0 (运行在宿主机)
- Node.js >= 18.0.0 (用于前端开发)
- MySQL >= 8.0 / MariaDB >= 10.5
- Nginx (生产环境)

#### 1. 安装依赖
```bash
# 安装 Bun (如果未安装)
curl -fsSL https://bun.sh/install | bash

# 安装 Redis (Debian/Ubuntu)
sudo apt-get update
sudo apt-get install -y redis-server
sudo service redis-server start

# 验证 Redis 运行
redis-cli ping  # 应该返回 PONG
```

#### 2. 构建前端静态文件
```bash
cd frontend
bun install
bun run build:public
```

#### 3. 配置环境变量
```bash
cd backend
cp .env.example .env
nano .env  # 编辑配置
```

确保 `.env` 中 Redis 连接地址为:
```bash
REDIS_URL="redis://127.0.0.1:6379"
```

#### 4. 初始化数据库
```bash
cd backend
bun run prisma:generate
bun run prisma:migrate
```

#### 5. 配置 Nginx
```bash
sudo ./scripts/install-nginx-config.sh
```

#### 6. 设置文件权限
```bash
sudo chown -R www-data:www-data /root/git/spanel-bun/frontend/dist
sudo chmod -R 755 /root/git/spanel-bun/frontend/dist
```

#### 7. 启动后端
```bash
cd backend
bun run dev

# 或使用 PM2 (生产环境)
pm2 start backend/src/index.ts --name spanel-api
pm2 save
pm2 startup
```

### 本地开发

**后端开发:**
```bash
cd backend
bun install
bun run dev
```

**前端开发:**
```bash
cd frontend
npm install
npm run dev
```

**Redis 管理:**
```bash
# 启动
sudo service redis-server start

# 停止
sudo service redis-server stop

# 重启
sudo service redis-server restart
```

## 访问地址

部署完成后访问:

| 页面 | URL |
|------|-----|
| 用户登录 | https://test-spanel-bun.freessr.bid/user/login.html |
| 用户仪表板 | https://test-spanel-bun.freessr.bid/user/index.html |
| 用户注册 | https://test-spanel-bun.freessr.bid/user/register.html |
| 管理后台 | https://test-spanel-bun.freessr.bid/admin/index.html |
| API 健康检查 | https://test-spanel-bun.freessr.bid/api/health |
| API 文档 (Swagger) | https://test-spanel-bun.freessr.bid/api/swagger |
| API 根路径 | https://test-spanel-bun.freessr.bid/api/ |

## 部署架构

```
test-spanel-bun.freessr.bid
├── /api/*      → Bun API (宿主机 127.0.0.1:3000)
├── /user/*     → 用户端静态文件 (frontend/dist/src/pages/index/)
├── /admin/*    → 管理端静态文件 (frontend/dist/admin/)
└── /*          → 重定向到 /user/
```

**运行环境**:
- Bun 后端: 宿主机原生运行,监听 3000 端口
- Redis: 宿主机原生运行,监听 6379 端口
- Nginx: 宿主机运行,反向代理 API 和服务静态文件
- MySQL: 远程数据库 103.214.22.166:3306

## 脚本说明

### scripts/ 目录

| 脚本 | 说明 |
|------|------|
| `build-local.sh` | 构建前端静态HTML (旧版,构建到 dist/) |
| `build-public.sh` (frontend/) | 构建前端到 public/ (推荐) |
| `deploy-public.sh` | 部署 public/ 到 /var/www/ |
| `deploy-web.sh` | 旧版部署脚本 |
| `install-nginx-config.sh` | 安装 Nginx 配置 |
| `start.sh` | 启动 Docker 开发环境 |

### 推荐工作流程

1. **构建前端**:
   ```bash
   cd frontend
   ./scripts/build-public.sh
   ```

2. **部署前端**:
   ```bash
   sudo ./scripts/deploy-public.sh
   ```

3. **构建完成后**:
   - 静态文件在: `frontend/public/`
   - 软链接在: `/var/www/test-spanel-bun.freessr.bid`
   - 权限已设置: 755, www-data:www-data

4. **Nginx 自动重载**

## 开发计划

详细实施计划请查看 [docs/PLAN.md](./docs/PLAN.md)

### 当前进度

- [x] 项目初始化
- [x] 后端基础框架
- [x] 前端基础框架
- [x] 静态HTML生成
- [x] 部署脚本
- [x] Nginx配置
- [ ] 用户认证模块
- [ ] API接口实现
- [ ] 前端Vue组件
- [ ] 管理端开发

## 性能目标

- ⚡ 首屏加载 < 1s（4G网络）
- ⚡ API响应时间 < 100ms (P95)
- ⚡ 并发支持 > 1000 QPS
- ⚡ 内存占用 < 100MB (单实例)

## 核心优势

1. **高性能**: Bun 比 PHP 快 3-4 倍
2. **类型安全**: 全栈 TypeScript，编译时类型检查
3. **开发体验**: Vite HMR + 热重载，开发效率高
4. **部署简单**: 前端纯静态，后端单一进程
5. **成本优化**: 前端可放 CDN/OSS，后端只需小服务器

## 文档

- [完整实施方案](./docs/PLAN.md)
- [快速开始指南](./docs/QUICKSTART.md)
- [部署文档](./docs/DEPLOYMENT.md)
- [快速参考](./docs/QUICKREF.md)
- [项目总结](./docs/PROJECT_SUMMARY.md)

## 故障排查

### 前端404
```bash
# 检查软链接
ls -la /var/www/test-spanel-bun.freessr.bid

# 重新部署
sudo ./scripts/deploy-public.sh
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

## 许可证

MIT License
