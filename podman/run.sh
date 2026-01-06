#!/bin/bash
# Spanel Bun 容器管理脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 函数:打印信息
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# 检查并创建 main 网络
check_network() {
    info "检查 main 网络..."
    if ! podman network ls | grep -q "main"; then
        info "创建 main 网络..."
        podman network create main
    else
        info "main 网络已存在"
    fi
}

# 构建镜像
build_image() {
    info "构建容器镜像..."
    cd "$(dirname "$0")"
    podman build -t spanel-bun:latest .
}

# 启动容器
start_container() {
    info "启动容器..."
    cd "$(dirname "$0")"

    # 检查容器是否已存在
    if podman ps -a | grep -q spanel-bun-dev; then
        info "容器已存在,启动中..."
        podman start spanel-bun-dev
    else
        info "创建并启动新容器..."
        podman run -d \
            --name spanel-bun-dev \
            --network main \
            -v /root/git/spanel-bun:/app:Z \
            -p 3000:3000 \
            -p 9229:9229 \
            -e NODE_ENV=development \
            --restart unless-stopped \
            spanel-bun:latest
    fi
}

# 停止容器
stop_container() {
    info "停止容器..."
    podman stop spanel-bun-dev || true
}

# 进入容器
exec_container() {
    info "进入容器..."
    podman exec -it spanel-bun-dev /bin/bash
}

# 查看日志
view_logs() {
    podman logs -f spanel-bun-dev
}

# 查看状态
status() {
    podman ps | grep spanel-bun-dev
}

# 主函数
main() {
    case "${1:-start}" in
        build)
            check_network
            build_image
            ;;
        start)
            check_network
            start_container
            info "容器已启动! 使用 '$0 exec' 进入容器"
            ;;
        stop)
            stop_container
            ;;
        restart)
            stop_container
            start_container
            ;;
        exec)
            exec_container
            ;;
        logs)
            view_logs
            ;;
        status)
            status
            ;;
        rebuild)
            check_network
            build_image
            stop_container
            start_container
            ;;
        *)
            echo "用法: $0 {build|start|stop|restart|exec|logs|status|rebuild}"
            echo ""
            echo "命令说明:"
            echo "  build    - 构建容器镜像"
            echo "  start    - 启动容器(默认)"
            echo "  stop     - 停止容器"
            echo "  restart  - 重启容器"
            echo "  exec     - 进入容器 shell"
            echo "  logs     - 查看容器日志"
            echo "  status   - 查看容器状态"
            echo "  rebuild  - 重新构建并启动"
            exit 1
            ;;
    esac
}

main "$@"
