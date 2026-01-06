# SPanel Bun - 快速开始指南

## 前提条件

确保你的系统已安装以下工具之一:
- Docker (推荐) 或 Podman
- Bun >= 1.0.0
- Node.js >= 18.0.0 (用于本地前端开发)

## 快速开始 (Docker)

### 1. 克隆项目

```bash
git clone <repository-url>
cd spanel-bun
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件,修改必要的配置
```

### 3. 启动服务

```bash
# 使用启动脚本 (推荐)
chmod +x start.sh
./start.sh

# 或手动启动
docker compose up -d
# 或
podman compose up -d
```

### 4. 查看服务状态

```bash
docker compose ps
# 或
docker compose logs -f
```

### 5. 访问服务

- **前端开发服务器**: http://localhost:5173
- **后端 API**: http://localhost:3000
- **健康检查**: http://localhost:3000/health

## 本地开发

### 后端开发

```bash
cd backend

# 安装依赖
bun install

# 配置环境变量
cp .env.example .env
# 编辑 .env 配置数据库连接等

# 生成 Prisma Client
bun run prisma:generate

# 运行数据库迁移
bun run prisma:migrate

# 启动开发服务器
bun run dev
```

后端 API 将运行在 http://localhost:3000

### 前端开发

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端开发服务器将运行在 http://localhost:5173

## 数据库设置

### 使用 Docker 启动的 MySQL

Docker Compose 会自动启动 MySQL 服务,默认配置:
- Host: localhost
- Port: 3306
- Database: spanel
- User: spanel
- Password: spanel_password

### 手动设置 MySQL

如果你使用本地 MySQL:

```bash
# 创建数据库
mysql -u root -p
CREATE DATABASE spanel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'spanel'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON spanel.* TO 'spanel'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

然后更新 `backend/.env` 中的 `DATABASE_URL`

### 数据库迁移

```bash
cd backend

# 生成 Prisma Client
bun run prisma:generate

# 运行迁移
bun run prisma:migrate

# (可选) 填充初始数据
bun run prisma:db seed
```

## 项目结构

```
spanel-bun/
├── backend/           # 后端 (Bun + Hono + Prisma)
│   ├── src/
│   │   ├── controllers/    # API 控制器
│   │   ├── services/       # 业务逻辑
│   │   ├── middleware/     # 中间件
│   │   └── index.ts        # 入口文件
│   ├── prisma/
│   │   └── schema.prisma   # 数据库 Schema
│   └── package.json
│
├── frontend/          # 前端 (Vue 3 + Vite)
│   ├── src/
│   │   ├── pages/         # 多页面入口
│   │   │   ├── index/     # 首页/仪表板
│   │   │   ├── login/     # 登录页
│   │   │   └── ...
│   │   ├── shared/        # 共享代码
│   │   │   ├── api/       # API 客户端
│   │   │   ├── stores/    # 状态管理
│   │   │   └── composables/ # 组合式函数
│   │   └── assets/
│   └── package.json
│
├── docker-compose.yml  # Docker Compose 配置
└── README.md
```

## 开发工具推荐

### IDE
- **VS Code** + 官方插件
  - Vue - Official
  - TypeScript Vue Plugin
  - Prisma
  - ESLint

### API 测试
- **Bruno** 或 **Insomnia**: 轻量级 API 测试工具
- **Postman**: 功能完整的 API 测试平台
- **curl**: 命令行工具

### 数据库管理
- **Prisma Studio**: 可视化数据库管理
  ```bash
  cd backend
  bun run prisma:studio
  ```
- **DBeaver** 或 **TablePlus**: 数据库 GUI 工具

### 网页检查
- **Playwright MCP**: 用于自动化网页测试和检查
- **Chrome DevTools**: 浏览器开发者工具

## 常见问题

### 1. Docker 服务无法启动

```bash
# 查看日志
docker compose logs -f

# 重启服务
docker compose restart
```

### 2. 数据库连接失败

检查 `backend/.env` 中的 `DATABASE_URL` 是否正确:

```env
DATABASE_URL="mysql://spanel:spanel_password@localhost:3306/spanel"
```

### 3. 前端无法连接后端 API

检查 `frontend/vite.config.ts` 中的代理配置:

```ts
proxy: {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
  },
}
```

### 4. Prisma 迁移失败

```bash
# 重置数据库 (谨慎使用!)
cd backend
bun run prisma:migrate reset

# 或手动删除迁移历史
rm -rf prisma/migrations/*
bun run prisma:migrate dev --name init
```

## 下一步

- 查看 [docs/PLAN.md](./PLAN.md) 了解完整的实施计划
- 查看 [backend/README.md](../backend/README.md) 了解后端 API 文档
- 查看 [frontend/README.md](../frontend/README.md) 了解前端组件文档

## 技术支持

如有问题,请提交 Issue 或查看文档。
