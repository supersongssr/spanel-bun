# Playwright MCP 快速开始指南

## 快速配置 Claude Code + Playwright MCP

### 1. 确认通用容器运行

```bash
cd /root/git/podman-containers/playwright-mcp
./run.sh status
```

如果未运行,启动它:
```bash
./run.sh start
```

### 2. 配置 Claude Code

找到你的 Claude Code 配置文件(通常在):
- Linux: `~/.config/claude-code/config.json`
- macOS: `~/Library/Application Support/Claude Code/config.json`

添加以下配置:

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

### 3. 重启 Claude Code

完全退出并重新启动 Claude Code 应用。

### 4. 测试 MCP 连接

在 Claude Code 中输入:
```
请打开 https://example.com 并告诉我页面标题
```

如果成功,你应该能看到网页的标题信息。

## 通用容器管理

```bash
# 进入容器目录
cd /root/git/podman-containers/playwright-mcp

# 查看状态
./run.sh status

# 查看日志
./run.sh logs

# 重启容器
./run.sh restart

# 停止容器
./run.sh stop

# 进入容器 shell
./run.sh exec
```

## 验证 MCP 服务器

```bash
# 检查 MCP 服务器是否安装
podman exec playwright-mcp-server which playwright-mcp-server

# 查看 MCP 服务器帮助
podman exec playwright-mcp-server playwright-mcp-server --help
```

## 功能示例

配置成功后,你可以让 Claude Code:

- 🌐 打开和浏览网页
- 📸 截取网页截图
- 🔍 查找和点击页面元素
- 📝 填写表单
- 📊 提取页面数据
- 🧪 自动化浏览器测试

## 多项目共享

这个通用 Playwright MCP 容器可以被所有项目使用!

只需在每个项目的 Claude Code 配置中添加相同的配置即可。无需重复安装!

## 需要帮助?

查看完整文档:
- [安装文档](docs/INSTALL.md)
- [MCP 配置详解](docs/PLAYWRIGHT_MCP.md)
- [通用容器 README](/root/git/podman-containers/playwright-mcp/README.md)
