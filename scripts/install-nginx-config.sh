#!/bin/bash

# SPanel Nginx Configuration Installer
# This script installs the nginx configuration

set -e

echo "🔧 SPanel Nginx Configuration Installer"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: This script must be run as root${NC}"
    echo "Please use: sudo ./install-nginx-config.sh"
    exit 1
fi

# Variables
PROJECT_DIR="/root/git/spanel-bun"
NGINX_CONF_DIR="/etc/nginx/conf.d"
NGINX_CONF_SOURCE="$PROJECT_DIR/nginx/test-spanel-bun.freessr.bid.conf"
DOMAIN="test-spanel-bun.freessr.bid"

echo -e "${YELLOW}Configuration:${NC}"
echo "  Project: $PROJECT_DIR"
echo "  Nginx Conf Dir: $NGINX_CONF_DIR"
echo "  Domain: $DOMAIN"
echo ""

# Check if nginx config source exists
if [ ! -f "$NGINX_CONF_SOURCE" ]; then
    echo -e "${RED}Error: Nginx config source not found!${NC}"
    echo "Expected: $NGINX_CONF_SOURCE"
    exit 1
fi

echo -e "${GREEN}✓ Nginx config source found${NC}"

# Check if SSL certificates exist
SSL_CERT="/etc/ssl/freessr.bid.crt"
SSL_KEY="/etc/ssl/freessr.bid.key"

echo ""
echo "Checking SSL certificates..."
if [ -f "$SSL_CERT" ] && [ -f "$SSL_KEY" ]; then
    echo -e "${GREEN}✓ SSL certificates found${NC}"
    echo "  Certificate: $SSL_CERT"
    echo "  Key: $SSL_KEY"
else
    echo -e "${RED}✗ SSL certificates not found!${NC}"
    echo "  Expected:"
    echo "    - $SSL_CERT"
    echo "    - $SSL_KEY"
    echo ""
    echo "Please ensure SSL certificates are installed before continuing."
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Backup existing configuration if it exists
if [ -f "$NGINX_CONF_DIR/test-spanel-bun.freessr.bid.conf" ]; then
    echo ""
    echo "Backing up existing configuration..."
    cp "$NGINX_CONF_DIR/test-spanel-bun.freessr.bid.conf" \
       "$NGINX_CONF_DIR/test-spanel-bun.freessr.bid.conf.backup.$(date +%Y%m%d_%H%M%S)"
    echo -e "${GREEN}✓ Backup created${NC}"
fi

# Copy new configuration
echo ""
echo "Installing nginx configuration..."
cp "$NGINX_CONF_SOURCE" "$NGINX_CONF_DIR/"
echo -e "${GREEN}✓ Configuration copied to $NGINX_CONF_DIR${NC}"

# Test nginx configuration
echo ""
echo "Testing nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Nginx configuration test passed${NC}"

    # Reload nginx
    echo ""
    echo "Reloading nginx..."
    systemctl reload nginx

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Nginx reloaded successfully${NC}"
    else
        echo -e "${RED}✗ Failed to reload nginx${NC}"
        echo "Please check: systemctl status nginx"
        exit 1
    fi
else
    echo -e "${RED}✗ Nginx configuration test failed${NC}"
    echo ""
    echo "Please check the configuration:"
    echo "  nginx -t"
    echo ""
    echo "View logs:"
    echo "  journalctl -u nginx -n 50"
    exit 1
fi

echo ""
echo "=============================================="
echo -e "${GREEN}✓ Nginx configuration installed successfully!${NC}"
echo "=============================================="
echo ""
echo "Configuration file: $NGINX_CONF_DIR/test-spanel-bun.freessr.bid.conf"
echo ""
echo "Your site should be available at:"
echo "  https://$DOMAIN"
echo ""
echo "URLs:"
echo "  User Dashboard: https://$DOMAIN/user/index.html"
echo "  User Login:     https://$DOMAIN/user/login.html"
echo "  User Register:  https://$DOMAIN/user/register.html"
echo "  Admin Panel:    https://$DOMAIN/admin/index.html"
echo "  API Backend:    https://$DOMAIN/api/"
echo ""
echo "Next steps:"
echo "  1. Ensure Bun backend is running: cd $PROJECT_DIR/backend && bun run dev"
echo "  2. Check backend health: curl https://$DOMAIN/api/health"
echo "  3. View logs: tail -f /var/log/nginx/test-spanel-bun-*.log"
echo ""
