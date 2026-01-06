#!/bin/bash

# SPanel Deployment Script
# This script creates symlinks to /var/www and configures nginx

set -e

echo "🚀 SPanel Deployment Script"
echo "=============================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: This script must be run as root${NC}"
    echo "Please use: sudo ./deploy-web.sh"
    exit 1
fi

# Variables
PROJECT_DIR="/root/git/spanel-bun"
WEB_DIR="/var/www"
DOMAIN="test-spanel-bun.freessr.bid"
DIST_DIR="$PROJECT_DIR/frontend/dist"

echo -e "${YELLOW}Configuration:${NC}"
echo "  Project: $PROJECT_DIR"
echo "  Web Directory: $WEB_DIR"
echo "  Domain: $DOMAIN"
echo "  Dist: $DIST_DIR"
echo ""

# Check if dist directory exists
if [ ! -d "$DIST_DIR" ]; then
    echo -e "${RED}Error: Frontend dist directory not found!${NC}"
    echo "Please run: cd frontend && ./build-local.sh"
    exit 1
fi

echo -e "${GREEN}✓ Frontend dist found${NC}"

# Create symlinks
echo ""
echo "Creating symlinks to $WEB_DIR..."

# Remove existing symlinks if they exist
if [ -L "$WEB_DIR/test-spanel-bun" ]; then
    echo "  Removing existing symlink..."
    rm -f "$WEB_DIR/test-spanel-bun"
fi

# Create new symlink
echo "  Creating symlink: $WEB_DIR/test-spanel-bun -> $DIST_DIR"
ln -s "$DIST_DIR" "$WEB_DIR/test-spanel-bun"

# Set permissions
echo "  Setting permissions..."
chmod -R 755 "$DIST_DIR"
chown -R www-data:www-data "$DIST_DIR" 2>/dev/null || chown -R nginx:nginx "$DIST_DIR" 2>/dev/null || true

echo -e "${GREEN}✓ Symlink created successfully${NC}"

# List the structure
echo ""
echo "Directory structure:"
ls -la "$WEB_DIR/" | grep test-spanel-bun || true
echo ""

# Test nginx configuration
echo "Testing Nginx configuration..."
if command -v nginx &> /dev/null; then
    nginx -t
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Nginx configuration is valid${NC}"
        echo ""
        echo "Reloading Nginx..."
        systemctl reload nginx
        echo -e "${GREEN}✓ Nginx reloaded${NC}"
    else
        echo -e "${RED}✗ Nginx configuration test failed${NC}"
        echo "Please check: nginx -t"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠ Nginx not found. Please install and configure nginx manually.${NC}"
fi

echo ""
echo "=============================================="
echo -e "${GREEN}✓ Deployment completed successfully!${NC}"
echo "=============================================="
echo ""
echo "Your site is now available at:"
echo "  https://$DOMAIN"
echo ""
echo "URLs:"
echo "  User Dashboard: https://$DOMAIN/user/index.html"
echo "  User Login:     https://$DOMAIN/user/login.html"
echo "  User Register:  https://$DOMAIN/user/register.html"
echo "  Admin Panel:    https://$DOMAIN/admin/index.html"
echo "  API Backend:    https://$DOMAIN/api/"
echo ""
