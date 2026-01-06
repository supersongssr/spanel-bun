#!/bin/bash

# SPanel Bun - Quick Start Script

echo "🚀 SPanel Bun - Starting Development Environment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null && ! command -v podman &> /dev/null; then
    echo "❌ Error: Docker or Podman is not installed!"
    exit 1
fi

# Use docker or podman
CONTAINER_CMD="docker"
if command -v podman &> /dev/null; then
    CONTAINER_CMD="podman"
fi

echo "📦 Using $CONTAINER_CMD"

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
fi

# Start services
echo "🔧 Starting services..."
$CONTAINER_CMD compose up -d

echo ""
echo "✅ Services started successfully!"
echo ""
echo "📊 Service URLs:"
echo "   Frontend (Dev): http://localhost:5173"
echo "   Backend API:    http://localhost:3000"
echo "   MySQL:         localhost:3306"
echo "   Redis:         localhost:6379"
echo ""
echo "📝 To view logs:"
echo "   $CONTAINER_CMD compose logs -f"
echo ""
echo "🛑 To stop services:"
echo "   $CONTAINER_CMD compose down"
echo ""
