import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'

// Import routes
// TODO: Temporarily disabled due to Prisma compatibility issues
// import authRoutes from './controllers/auth.controller'
// import userRoutes from './controllers/user.controller'
// import nodeRoutes from './controllers/node.controller'
// import adminRoutes from './controllers/admin.controller'

// Create Hono app
const app = new Hono()

// Middleware
app.use('*', logger())

// CORS middleware (simple version)
app.use('*', async (c, next) => {
  // Add CORS headers
  c.header('Access-Control-Allow-Origin', 'https://test-spanel-bun.freessr.bid')
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  c.header('Access-Control-Allow-Credentials', 'true')

  // Handle preflight requests
  if (c.req.method === 'OPTIONS') {
    return c.text('', 204)
  }

  await next()
})

// Health check
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    message: 'SPanel API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  })
})

app.get('/health', (c) => {
  return c.json({ status: 'healthy', timestamp: new Date().toISOString() })
})

// API routes
// Temporarily disabled - will be re-enabled after fixing Prisma
// app.route('/auth', authRoutes)
// app.route('/user', userRoutes)
// app.route('/node', nodeRoutes)
// app.route('/admin', adminRoutes)

// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'Not Found',
    message: 'The requested resource was not found'
  }, 404)
})

// Error handler
app.onError((err, c) => {
  console.error('Error:', err)
  return c.json({
    error: 'Internal Server Error',
    message: err.message
  }, 500)
})

// Start server
const port = parseInt(process.env.PORT || '3000')

console.log(`🚀 SPanel API server starting on port ${port}`)

serve({
  fetch: app.fetch,
  port,
})

console.log(`✅ Server is running on http://localhost:${port}`)
