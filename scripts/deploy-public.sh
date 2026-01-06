#!/bin/bash

# SPanel Frontend Deployment Script
# Deploys public directory to /var/www/

set -e

echo "🚀 SPanel Frontend Deployment"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: This script must be run as root${NC}"
    echo "Please use: sudo ./scripts/deploy-public.sh"
    exit 1
fi

# Variables
PROJECT_DIR="/root/git/spanel-bun"
PUBLIC_DIR="$PROJECT_DIR/frontend/public"
WEB_DIR="/var/www/test-spanel-bun.freessr.bid"
DOMAIN="test-spanel-bun.freessr.bid"

echo -e "${YELLOW}Configuration:${NC}"
echo "  Project: $PROJECT_DIR"
echo "  Public: $PUBLIC_DIR"
echo "  Web Directory: $WEB_DIR"
echo "  Domain: $DOMAIN"
echo ""

# Check if public directory exists
if [ ! -d "$PUBLIC_DIR" ]; then
    echo -e "${RED}Error: Public directory not found!${NC}"
    echo "Please run: cd frontend && ./scripts/build-public.sh"
    exit 1
fi

echo -e "${GREEN}✓ Public directory found${NC}"

# Show what will be deployed
echo ""
echo "📁 Files to deploy:"
ls -la "$PUBLIC_DIR/"
echo ""

# Create deployment directory
echo "Creating deployment directory..."
mkdir -p "$WEB_DIR"

# Remove existing symlink if it exists
if [ -L "$WEB_DIR" ]; then
    echo "  Removing existing symlink..."
    rm -f "$WEB_DIR"
fi

# If it's a real directory, backup it
if [ -d "$WEB_DIR" ] && [ ! -L "$WEB_DIR" ]; then
    echo "  Backing up existing directory..."
    mv "$WEB_DIR" "$WEB_DIR.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Create symlink
echo "  Creating symlink: $WEB_DIR -> $PUBLIC_DIR"
ln -s "$PUBLIC_DIR" "$WEB_DIR"

# Set permissions
echo "  Setting permissions..."
chmod -R 755 "$PUBLIC_DIR"
chown -R www-data:www-data "$PUBLIC_DIR" 2>/dev/null || chown -R nginx:nginx "$PUBLIC_DIR" 2>/dev/null || true

echo -e "${GREEN}✓ Symlink created successfully${NC}"

# Verify deployment
echo ""
echo "🔍 Verifying deployment:"
ls -la "$WEB_DIR"
echo ""

# List deployed files
echo "📄 Deployed files:"
ls -la "$WEB_DIR/user/ 2>/dev/null" || echo "  (user/ not found)"
ls -la "$WEB_DIR/admin/ 2>/dev/null" || echo "  (admin/ not found)"
echo ""

# Test nginx if available
if command -v nginx &> /dev/null; then
    echo "Testing Nginx configuration..."
    nginx -t
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Nginx configuration is valid${NC}"
        echo ""
        echo "Reloading Nginx..."
        systemctl reload nginx
        echo -e "${GREEN}✓ Nginx reloaded${NC}"
    else
        echo -e "${YELLOW}⚠ Nginx configuration test failed${NC}"
        echo "Please check: nginx -t"
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
echo "📝 Symlink info:"
echo "  $WEB_DIR -> $PUBLIC_DIR"
echo ""
