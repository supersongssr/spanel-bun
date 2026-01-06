# SPanel Backend - Production Dockerfile
# Using official Bun image

FROM docker.io/oven/bun:1.3.5-alpine

# Set working directory
WORKDIR /app

# Install dependencies (copy package files first for better caching)
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Copy source code
COPY . .

# Generate Prisma Client
RUN bun run prisma:generate

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD bun --version && wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Run the app
CMD ["bun", "run", "src/index.ts"]
