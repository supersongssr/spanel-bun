#!/bin/bash

# SPanel Frontend Build Script

echo "🔨 Building SPanel Frontend..."

# Install dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build for production
echo "🚀 Building for production..."
npm run build

echo "✅ Build complete!"
echo "📁 Output directory: dist/"
echo ""
echo "Next steps:"
echo "1. Link to web directory:"
echo "   sudo ln -sf /root/git/spanel-bun/frontend/dist /var/www/test-spanel-bun"
echo ""
echo "2. Restart nginx:"
echo "   sudo nginx -t && sudo systemctl reload nginx"
