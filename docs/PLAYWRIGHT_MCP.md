# Playwright MCP 配置指南

## 什么是 Playwright MCP?

Playwright MCP 是一个 Model Context Protocol (MCP) 服务器,允许 Claude Code 通过浏览器自动化与网页交互。它基于 Playwright 库,可以模拟真实用户在浏览器中的操作。

## 通用 Playwright MCP 容器

本项目使用**通用的 Playwright MCP 容器**,可以被所有项目共享使用:

- **容器位置**: `/root/git/podman-containers/playwright-mcp`
- **容器名称**: `playwright-mcp-server`
- **镜像名称**: `playwright-mcp:latest`
- **网络**: `main`
- **端口**: `8931` (HTTP 模式)

### 通用容器的优势

- ✅ 一次安装,所有项目共享
- ✅ 统一管理和更新
- ✅ 节省磁盘空间
- ✅ 独立于项目容器

## 在 Claude Code 中配置 Playwright MCP

### 方法 1: 使用 stdio 模式(推荐)

编辑 Claude Code 配置文件(通常位于 `~/.config/claude-code/config.json`):

```json
{
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
}
```

**说明:**
- 使用 `-i` 参数保持 STDIN 打开,这对 MCP 通信至关重要
- 通用容器名称是 `playwright-mcp-server`
- Claude Code 会通过 stdio 与容器内的 MCP 服务器通信

### 方法 2: 使用 HTTP 模式

#### 2.1 启动 MCP HTTP 服务器

使用容器管理脚本启动 HTTP 模式:

```bash
cd /root/git/podman-containers/playwright-mcp
./run.sh start-http
```

或者在容器内手动启动:

```bash
podman exec -d playwright-mcp-server playwright-mcp-server --port 8931
```

#### 2.2 配置 Claude Code 使用 HTTP 模式

```json
{
  "mcpServers": {
    "playwright": {
      "url": "http://localhost:8931/mcp",
      "type": "http"
    }
  }
}
```

**注意:** 通用容器已经配置好端口映射,可以直接使用。

## 管理通用 Playwright MCP 容器

### 启动容器

```bash
cd /root/git/podman-containers/playwright-mcp
./run.sh start
```

### 查看状态

```bash
./run.sh status
```

### 查看日志

```bash
./run.sh logs
```

### 停止容器

```bash
./run.sh stop
```

### 进入容器

```bash
./run.sh exec
```

## 在其他项目中使用

通用容器可以被所有项目使用!只需要在项目的 Claude Code 配置中添加:

```json
{
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
}
```

### 示例: 多个项目共享

**项目 A (spanel-bun)**
```json
{
  "mcpServers": {
    "playwright": {
      "command": "podman",
      "args": ["exec", "-i", "playwright-mcp-server", "playwright-mcp-server"]
    }
  }
}
```

**项目 B (另一个项目)**
```json
{
  "mcpServers": {
    "playwright": {
      "command": "podman",
      "args": ["exec", "-i", "playwright-mcp-server", "playwright-mcp-server"]
    }
  }
}
```

两个项目共享同一个 Playwright MCP 容器!

## 验证 MCP 配置

### 测试 stdio 模式连接

1. 确认通用容器正在运行:
   ```bash
   podman ps | grep playwright-mcp-server
   ```

2. 重启 Claude Code

3. 在 Claude Code 对话中尝试使用浏览器相关功能

4. 检查 Claude Code 日志,确认 MCP 服务器连接成功

### 测试 HTTP 模式连接

1. 启动 HTTP 服务器:
   ```bash
   cd /root/git/podman-containers/playwright-mcp
   ./run.sh start-http
   ```

2. 确认 MCP HTTP 服务器正在运行:
   ```bash
   podman exec playwright-mcp-server ps aux | grep playwright-mcp-server
   ```

3. 测试端点是否可访问:
   ```bash
   curl http://localhost:8931/mcp
   ```

4. 重启 Claude Code 并测试功能

## 使用 Playwright MCP

配置成功后,你可以在 Claude Code 中使用类似以下的功能:

- "请打开 https://example.com 并截图"
- "帮我点击页面上的登录按钮"
- "获取页面标题和所有链接"
- "填写表单并提交"

## 故障排查

### 问题 1: 容器未运行

**解决方案:**
```bash
cd /root/git/podman-containers/playwright-mcp
./run.sh start
```

### 问题 2: Claude Code 无法连接到 MCP 服务器

**解决方案:**
1. 检查容器是否运行:
   ```bash
   podman ps | grep playwright-mcp-server
   ```

2. 检查 MCP 服务器是否可访问:
   ```bash
   podman exec playwright-mcp-server which playwright-mcp-server
   ```

3. 查看 Claude Code 日志获取详细错误信息

### 问题 3: stdio 模式无响应

**解决方案:**
1. 确保使用了 `-i` 参数:
   ```bash
   podman exec -i playwright-mcp-server playwright-mcp-server
   ```

2. 测试手动连接:
   ```bash
   echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | podman exec -i playwright-mcp-server playwright-mcp-server
   ```

### 问题 4: HTTP 模式无法访问

**解决方案:**
1. 确认端口已暴露:
   ```bash
   podman port playwright-mcp-server
   ```

2. 检查 MCP HTTP 服务器是否正在运行:
   ```bash
   podman exec playwright-mcp-server ps aux | grep playwright-mcp-server
   ```

3. 查看服务器日志:
   ```bash
   cd /root/git/podman-containers/playwright-mcp
   ./run.sh logs
   ```

### 问题 5: Playwright 浏览器无法启动

**解决方案:**
Playwright 浏览器将在首次使用时自动下载。如果遇到问题:

1. 进入容器手动安装浏览器:
   ```bash
   cd /root/git/podman-containers/playwright-mcp
   ./run.sh exec
   playwright install chromium
   ```

2. 或者在容器外执行:
   ```bash
   podman exec playwright-mcp-server playwright install chromium
   ```

## 高级配置

### 使用多个 MCP 服务器

你可以在 Claude Code 中配置多个 MCP 服务器:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "podman",
      "args": ["exec", "-i", "playwright-mcp-server", "playwright-mcp-server"]
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/root/git/spanel-bun"]
    }
  }
}
```

### 更新通用容器

当需要更新 Playwright MCP 服务器时:

```bash
cd /root/git/podman-containers/playwright-mcp
./run.sh rebuild
```

### 通用容器维护

详细的使用说明请查看通用容器的 README:
```bash
cat /root/git/podman-containers/playwright-mcp/README.md
```

## 相关资源

- [Playwright 官方文档](https://playwright.dev/)
- [MCP 协议规范](https://modelcontextprotocol.io/)
- [Claude Code 文档](https://github.com/anthropics/claude-code)
- [ExecuteAutomation Playwright MCP Server](https://github.com/executeautomation/playwright-mcp-server)
- [通用 Playwright MCP 容器文档](/root/git/podman-containers/playwright-mcp/README.md)

## 支持

如果遇到问题:
1. 查看通用容器日志:
   ```bash
   cd /root/git/podman-containers/playwright-mcp
   ./run.sh logs
   ```

2. 检查 MCP 服务器状态:
   ```bash
   podman exec playwright-mcp-server playwright-mcp-server --help
   ```

3. 查看 Claude Code 日志和配置
