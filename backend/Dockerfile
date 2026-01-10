# SPanel Backend - Production Dockerfile
# Using official Bun image

FROM docker.io/oven/bun:1.3.5-alpine

# Install OpenSSL for Prisma and other dependencies
RUN apk add --no-cache openssl-dev curl

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Set working directory
WORKDIR /app

# Install dependencies (copy package files first for better caching)
COPY package.json bun.lock* ./

# Install dependencies (include devDependencies for Prisma CLI)
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Remove pre-built Prisma Client to force regeneration in container
RUN rm -rf node_modules/.prisma/client

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD bun --version && wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Set entrypoint
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# Run the app
CMD ["sh", "-c", "cd backend && exec bun run src/index.ts"]
