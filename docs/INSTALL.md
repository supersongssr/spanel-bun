# Spanel Bun 项目安装文档

## 项目简介

Spanel Bun 是一个前后端分离的项目,前端使用静态 HTML,后端使用 Bun API。

## 环境要求

- Podman (容器运行时)
- Bun (JavaScript 运行时)
- 项目目录: `/root/git/spanel-bun`

## 安装步骤

### 1. 创建 Podman 网络(如果不存在)

```bash
podman network create main
```

验证网络:
```bash
podman network ls | grep main
```

### 2. 构建容器镜像

项目提供了便捷的容器管理脚本,位于 `podman/` 目录。

```bash
cd /root/git/spanel-bun/podman
./run.sh build
```

这将:
- 使用 `podman/Containerfile` 构建镜像
- 镜像名称: `spanel-bun:latest`
- 基于 `docker.io/oven/bun:latest`
- 包含 Playwright 运行所需的系统依赖

### 3. 启动容器

```bash
cd /root/git/spanel-bun/podman
./run.sh start
```

这将:
- 创建并启动名为 `spanel-bun-dev` 的容器
- 连接到 `main` 网络
- 映射本地项目目录 `/root/git/spanel-bun` 到容器的 `/app`
- 暴露端口: `3000` (应用) 和 `9229` (调试)
- 设置环境变量 `NODE_ENV=development`
- 配置容器自动重启

### 4. 验证容器运行状态

```bash
./run.sh status
```

或使用 Podman 命令:
```bash
podman ps | grep spanel-bun-dev
```

### 5. 进入容器

```bash
./run.sh exec
```

或:
```bash
podman exec -it spanel-bun-dev /bin/bash
```

### 6. 在容器中安装项目依赖

进入容器后:
```bash
cd /app
bun install
```

## 容器管理脚本使用

`podman/run.sh` 脚本提供了便捷的容器管理命令:

| 命令 | 说明 |
|------|------|
| `./run.sh build` | 构建容器镜像 |
| `./run.sh start` | 启动容器 |
| `./run.sh stop` | 停止容器 |
| `./run.sh restart` | 重启容器 |
| `./run.sh exec` | 进入容器 shell |
| `./run.sh logs` | 查看容器日志 |
| `./run.sh status` | 查看容器状态 |
| `./run.sh rebuild` | 重新构建并启动 |

## 容器内环境

### 工作目录
- 容器内工作目录: `/app`
- 对应主机目录: `/root/git/spanel-bun`

### 已安装工具
- Bun: JavaScript 运行时和包管理器
- Python3: 用于某些工具脚本
- Git: 版本控制
- 系统依赖: Playwright 浏览器自动化所需的库

### 端口映射
- `3000` → 主机 `3000`: 应用端口
- `9229` → 主机 `9229`: Node.js 调试端口

## 网络配置

容器连接到自定义网络 `main`,可以与其他容器通信。

查看网络中的容器:
```bash
podman network inspect main
```

## 常见问题

### Q: 容器无法启动?
A: 检查 `main` 网络是否存在:
```bash
podman network ls
```
如果不存在,创建它:
```bash
podman network create main
```

### Q: 如何查看容器日志?
A: 使用脚本:
```bash
./run.sh logs
```
或使用 Podman 命令:
```bash
podman logs -f spanel-bun-dev
```

### Q: 如何重新构建镜像?
A:
```bash
./run.sh rebuild
```
这将停止当前容器,重新构建镜像,然后启动新容器。

### Q: 主机代码修改会同步到容器吗?
A: 是的,由于使用了目录卷映射,主机的代码修改会立即在容器内可见。

### Q: 如何删除容器?
A:
```bash
podman stop spanel-bun-dev
podman rm spanel-bun-dev
```

### Q: 如何删除镜像?
A:
```bash
podman rmi spanel-bun:latest
```

## 开发工作流

1. **启动容器**
   ```bash
   cd /root/git/spanel-bun/podman
   ./run.sh start
   ```

2. **进入容器**
   ```bash
   ./run.sh exec
   ```

3. **在容器内运行开发服务器**
   ```bash
   cd /app
   bun install      # 首次运行安装依赖
   bun run dev      # 启动开发服务器
   ```

4. **在主机上编辑代码**
   - 使用你喜欢的编辑器在 `/root/git/spanel-bun` 编辑代码
   - 修改会自动同步到容器

5. **停止容器**
   ```bash
   ./run.sh stop
   ```

## 项目结构

```
/root/git/spanel-bun/
├── podman/              # Podman 容器配置
│   ├── Containerfile    # 容器镜像构建文件
│   ├── run.sh          # 容器管理脚本
│   └── docker-compose.yml # Docker Compose 配置(备用)
├── backend/            # 后端代码
├── docs/               # 文档
│   ├── INSTALL.md      # 本文档
│   └── PLAYWRIGHT_MCP.md # Playwright MCP 配置指南
└── README.md           # 项目说明
```

## 下一步

安装完成后,请参考:
- [Playwright MCP 配置指南](./PLAYWRIGHT_MCP.md) - 配置 Playwright MCP 服务
- 项目 README.md - 了解项目使用方法

