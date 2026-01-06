#!/bin/bash

# SPanel Backend - 容器管理脚本

set -e

IMAGE_NAME="spanel-backend"
CONTAINER_NAME="spanel-backend"
NETWORK_NAME="main"
PORT="3000"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

case "$1" in
  build)
    echo "🔨 Building $IMAGE_NAME image..."
    cd /root/git/spanel-bun/backend
    podman build -t $IMAGE_NAME:latest -f Dockerfile .
    echo -e "${GREEN}✓ Build complete${NC}"
    ;;

  start)
    echo "🚀 Starting $CONTAINER_NAME..."
    podman run -d \
      --name $CONTAINER_NAME \
      --network $NETWORK_NAME \
      -p $PORT:3000 \
      -e DATABASE_URL="mysql://spanel:spanel_password@host.containers.internal:3306/spanel" \
      -e REDIS_URL="redis://host.containers.internal:6379" \
      -e JWT_SECRET="spanel-jwt-secret-key-2024" \
      -e JWT_EXPIRES_IN="7d" \
      -e PORT=$PORT \
      -e NODE_ENV=production \
      -e CORS_ORIGIN="https://test-spanel-bun.freessr.bid" \
      --restart unless-stopped \
      localhost/$IMAGE_NAME:latest
    echo -e "${GREEN}✓ Container started${NC}"
    podman ps | grep $CONTAINER_NAME
    ;;

  stop)
    echo "🛑 Stopping $CONTAINER_NAME..."
    podman stop $CONTAINER_NAME
    echo -e "${GREEN}✓ Container stopped${NC}"
    ;;

  restart)
    echo "🔄 Restarting $CONTAINER_NAME..."
    podman restart $CONTAINER_NAME
    echo -e "${GREEN}✓ Container restarted${NC}"
    podman ps | grep $CONTAINER_NAME
    ;;

  logs)
    echo "📋 Showing logs for $CONTAINER_NAME..."
    podman logs -f $CONTAINER_NAME
    ;;

  status)
    echo "📊 Container status:"
    podman ps | grep $CONTAINER_NAME
    echo ""
    echo "🌐 Network info:"
    podman inspect $CONTAINER_NAME | grep -A 10 "Networks" | grep "IPAddress\|Gateway"
    ;;

  rebuild)
    echo "🔨 Rebuilding $IMAGE_NAME..."
    cd /root/git/spanel-bun/backend
    podman build -t $IMAGE_NAME:latest -f Dockerfile .
    echo ""
    echo "🔄 Restarting container..."
    podman restart $CONTAINER_NAME
    echo -e "${GREEN}✓ Rebuild and restart complete${NC}"
    ;;

  test)
    echo "🧪 Testing API health..."
    echo -n "From host: "
    curl -s http://localhost:$PORT/api/health | head -c 100
    echo ""
    echo -n "From Playwright container: "
    podman exec playwright-mcp-server wget -q -O- http://10.89.1.13:$PORT/api/health 2>/dev/null | head -c 100
    echo ""
    ;;

  shell)
    echo "🐚 Opening shell in $CONTAINER_NAME..."
    podman exec -it $CONTAINER_NAME sh
    ;;

  *)
    echo "Usage: $0 {build|start|stop|restart|logs|status|rebuild|test|shell}"
    echo ""
    echo "Commands:"
    echo "  build    - Build the Docker image"
    echo "  start    - Start the container"
    echo "  stop     - Stop the container"
    echo "  restart  - Restart the container"
    echo "  logs     - Show container logs (follow)"
    echo "  status   - Show container status"
    echo "  rebuild  - Rebuild image and restart container"
    echo "  test     - Test API health endpoint"
    echo "  shell    - Open shell in container"
    exit 1
    ;;
esac
