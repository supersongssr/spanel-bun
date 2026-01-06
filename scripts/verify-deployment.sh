#!/bin/bash

# SPanel Deployment Verification Script

echo "🔍 SPanel Deployment Verification"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Variables
DOMAIN="test-spanel-bun.freessr.bid"
PUBLIC_DIR="/root/git/spanel-bun/frontend/public"
WEB_DIR="/var/www/test-spanel-bun.freessr.bid"
NGINX_CONF="/etc/nginx/conf.d/test-spanel-bun.freessr.bid.conf"
SSL_CERT="/etc/ssl/freessr.bid.crt"
SSL_KEY="/etc/ssl/freessr.bid.key"

echo "Checking deployment prerequisites..."
echo ""

# 1. Check frontend public directory
echo -n "1. Frontend public directory... "
if [ -d "$PUBLIC_DIR" ]; then
    echo -e "${GREEN}✓ Found${NC}"
    echo "   Path: $PUBLIC_DIR"
    ls -1 "$PUBLIC_DIR/user/" 2>/dev/null | sed 's/^/     - /'
else
    echo -e "${RED}✗ Not found${NC}"
    echo "   Run: cd frontend && ./scripts/build-public.sh"
fi
echo ""

# 2. Check symlink
echo -n "2. Web directory symlink... "
if [ -L "$WEB_DIR" ]; then
    echo -e "${GREEN}✓ Exists${NC}"
    LINK_TARGET=$(readlink -f "$WEB_DIR")
    echo "   $WEB_DIR -> $LINK_TARGET"
elif [ -d "$WEB_DIR" ]; then
    echo -e "${YELLOW}⚠ Directory exists (not symlink)${NC}"
    echo "   Path: $WEB_DIR"
else
    echo -e "${RED}✗ Not found${NC}"
    echo "   Run: sudo ./scripts/deploy-public.sh"
fi
echo ""

# 3. Check Nginx config
echo -n "3. Nginx configuration... "
if [ -f "$NGINX_CONF" ]; then
    echo -e "${GREEN}✓ Installed${NC}"
    echo "   Path: $NGINX_CONF"
else
    echo -e "${RED}✗ Not found${NC}"
    echo "   Run: sudo ./scripts/install-nginx-config.sh"
fi
echo ""

# 4. Check SSL certificates
echo -n "4. SSL certificates... "
if [ -f "$SSL_CERT" ] && [ -f "$SSL_KEY" ]; then
    echo -e "${GREEN}✓ Found${NC}"
    echo "   Certificate: $SSL_CERT"
    echo "   Key: $SSL_KEY"

    # Check certificate expiry
    EXPIRY=$(openssl x509 -in "$SSL_CERT" -noout -enddate 2>/dev/null | cut -d= -f2)
    if [ -n "$EXPIRY" ]; then
        echo "   Expires: $EXPIRY"
    fi
else
    echo -e "${RED}✗ Not found${NC}"
    echo "   Expected:"
    echo "     - $SSL_CERT"
    echo "     - $SSL_KEY"
    echo ""
    echo "   To get free SSL certificate:"
    echo "     sudo apt install certbot python3-certbot-nginx"
    echo "     sudo certbot --nginx -d $DOMAIN"
fi
echo ""

# 5. Check Nginx status
echo -n "5. Nginx service... "
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✓ Running${NC}"
    systemctl status nginx --no-pager -l | grep "Active:" | sed 's/^[ ]*/   /'
else
    echo -e "${RED}✗ Not running${NC}"
    echo "   Run: sudo systemctl start nginx"
fi
echo ""

# 6. Test Nginx configuration
echo -n "6. Nginx configuration test... "
if nginx -t 2>&1 | grep -q "successful"; then
    echo -e "${GREEN}✓ Valid${NC}"
else
    echo -e "${RED}✗ Failed${NC}"
    echo "   Run: sudo nginx -t"
fi
echo ""

# 7. Check backend (optional)
echo -n "7. Backend service (Bun)... "
if pgrep -f "bun.*index.ts" > /dev/null; then
    echo -e "${GREEN}✓ Running${NC}"
    PORT_OUTPUT=$(ss -tlnp 2>/dev/null | grep ":3000" || netstat -tlnp 2>/dev/null | grep ":3000")
    if [ -n "$PORT_OUTPUT" ]; then
        echo "   Listening on port 3000"
    fi
else
    echo -e "${YELLOW}⚠ Not running${NC}"
    echo "   Run: cd backend && bun run dev"
fi
echo ""

# 8. DNS resolution (optional)
echo -n "8. DNS resolution... "
if command -v dig &> /dev/null; then
    IP=$(dig +short $DOMAIN @8.8.8.8 2>/dev/null | head -1)
    if [ -n "$IP" ] && [[ ! "$IP" =~ ^;; ]]; then
        echo -e "${GREEN}✓ Resolves${NC}"
        echo "   $DOMAIN -> $IP"
    else
        echo -e "${YELLOW}⚠ Not configured yet${NC}"
        echo "   Add DNS A record: $DOMAIN -> <your-server-ip>"
    fi
elif command -v nslookup &> /dev/null; then
    IP=$(nslookup $DOMAIN 2>/dev/null | grep "Address:" | tail -1 | awk '{print $2}')
    if [ -n "$IP" ]; then
        echo -e "${GREEN}✓ Resolves${NC}"
        echo "   $DOMAIN -> $IP"
    else
        echo -e "${YELLOW}⚠ Not configured yet${NC}"
        echo "   Add DNS A record: $DOMAIN -> <your-server-ip>"
    fi
else
    echo -e "${YELLOW}⚠ Cannot check (dig/nslookup not found)${NC}"
fi
echo ""

# Summary
echo "=================================="
echo "Summary:"
echo ""

ALL_OK=true

if [ ! -d "$PUBLIC_DIR" ]; then
    echo -e "${RED}✗${NC} Frontend not built"
    ALL_OK=false
fi

if [ ! -L "$WEB_DIR" ] && [ ! -d "$WEB_DIR" ]; then
    echo -e "${RED}✗${NC} Web directory not linked"
    ALL_OK=false
fi

if [ ! -f "$SSL_CERT" ] || [ ! -f "$SSL_KEY" ]; then
    echo -e "${RED}✗${NC} SSL certificates missing"
    ALL_OK=false
fi

if ! systemctl is-active --quiet nginx; then
    echo -e "${RED}✗${NC} Nginx not running"
    ALL_OK=false
fi

if [ "$ALL_OK" = true ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "Your site should be accessible at:"
    echo "  https://$DOMAIN"
    echo ""
    echo "Available pages:"
    echo "  - https://$DOMAIN/user/login.html"
    echo "  - https://$DOMAIN/user/index.html"
    echo "  - https://$DOMAIN/user/register.html"
    echo "  - https://$DOMAIN/admin/index.html"
    echo "  - https://$DOMAIN/api/health"
else
    echo -e "${YELLOW}⚠ Some issues found. Please fix them above.${NC}"
fi
