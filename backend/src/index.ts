import { Elysia, t } from 'elysia'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import { jwt } from '@elysiajs/jwt'
import { prisma } from './lib/prisma'
import { hashPassword, verifyPassword, generateUUID } from './lib/password'
import { userController } from './controllers/user.controller'
import { nodeController } from './controllers/node.controller'
import { adminController } from './controllers/admin.controller'
import { nodeHeartbeatController } from './controllers/admin.controller'
import { subscribeController } from './controllers/subscribe.controller'
import { userTicketController } from './controllers/ticket.controller'
import { adminTicketController } from './controllers/ticket.controller'

// Create Elysia app
const app = new Elysia({
  prefix: '/api',
  cookie: {},
})

// Middleware: CORS
app.use(cors({
  origin: ['https://test-spanel-bun.freessr.bid', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// Middleware: JWT (registered but not enforced globally)
app.use(jwt({
  name: 'jwt',
  secret: process.env.JWT_SECRET || 'spanel-jwt-secret-key-2024-change-in-production',
}))

// Middleware: Swagger Documentation
app.use(swagger({
  path: '/swagger',
  documentation: {
    info: {
      title: 'SPanel API',
      version: 'v0',
      description: 'SPanel Backend API Documentation - Powered by Elysia.js',
    },
    tags: [
      { name: 'Health', description: 'Health check endpoints' },
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'User', description: 'User management endpoints' },
      { name: 'Node', description: 'Node management endpoints' },
    ],
    security: [
      {
        BearerAuth: [],
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
}))

// Health check endpoint
app.get('/health', async () => {
  // 执行数据库查询验证连接
  const userCount = await prisma.user.count()

  return {
    status: 'ok',
    framework: 'Elysia',
    version: 'v0',
    timestamp: new Date().toISOString(),
    database: {
      connected: true,
      userCount: userCount,
    },
  }
}, {
  detail: {
    tags: ['Health'],
    description: 'Check API health status and database connection',
  },
})

// Auth: Register
app.post('/auth/register', async ({ body, set }) => {
  try {
    const { email, user_name, password, inviteCode } = body as any

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email || undefined },
          { user_name: user_name || undefined },
        ],
      },
    })

    if (existingUser) {
      set.status = 400
      return {
        error: 'Bad Request',
        message: existingUser.email === email ? 'Email already exists' : 'Username already exists',
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Allocate random port (11111-55555)
    const port = Math.floor(Math.random() * (55555 - 11111 + 1)) + 11111

    // Create user using real database fields
    const user = await prisma.user.create({
      data: {
        email: email || null,
        user_name: user_name || null,
        pass: hashedPassword,  // 使用 'pass' 字段
        port: port,
        transfer_enable: BigInt(10 * 1024 * 1024 * 1024), // 10 GB default
        class: 0,
        node_speedlimit: 0,
        reg_ip: (body as any).ip || '127.0.0.1',
        money: 0,
        ref_by: 0,
        is_admin: 0,
        method: 'chacha20-ietf-poly1305',
        protocol: 'origin',
        obfs: 'plain',
      },
    })

    set.status = 201
    return {
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        user_name: user.user_name,
      },
    }
  } catch (error) {
    console.error('Register error:', error)
    set.status = 500
    return {
      error: 'Internal Server Error',
      message: 'Failed to register user',
    }
  }
}, {
  body: t.Object({
    email: t.Optional(t.String({ format: 'email' })),
    user_name: t.String({ minLength: 3, maxLength: 32 }),
    password: t.String({ minLength: 6, maxLength: 64 }),
    inviteCode: t.Optional(t.String()),
  }),
  detail: {
    tags: ['Auth'],
    description: 'Register a new user',
  },
})

// Auth: Login
app.post('/auth/login', async ({ body, jwt, set }) => {
  try {
    const { email, user_name, password } = body as any

    // Find user by email or username (使用真实数据库字段)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email || undefined },
          { user_name: user_name || undefined },
        ],
      },
    })

    if (!user) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'Invalid credentials',
      }
    }

    // Verify password (使用 pass 字段)
    const isValid = await verifyPassword(password, user.pass || '')

    if (!isValid) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'Invalid credentials',
      }
    }

    // Generate JWT token
    const token = await jwt.sign({
      userId: user.id,
      email: user.email,
      user_name: user.user_name,
      isAdmin: user.is_admin === 1,
    })

    return {
      message: 'Login successful',
      token: token,
      user: {
        id: user.id,
        email: user.email,
        user_name: user.user_name,
        is_admin: user.is_admin === 1,
        class: user.class,
        transfer_enable: user.transfer_enable.toString(),
        u: user.u.toString(),
        d: user.d.toString(),
      },
    }
  } catch (error) {
    console.error('Login error:', error)
    set.status = 500
    return {
      error: 'Internal Server Error',
      message: 'Failed to login',
    }
  }
}, {
  body: t.Object({
    email: t.Optional(t.String({ format: 'email' })),
    user_name: t.Optional(t.String()),
    password: t.String(),
  }),
  detail: {
    tags: ['Auth'],
    description: 'Login with email/username and password',
  },
})

// Root endpoint
app.get('/', () => ({
  status: 'ok',
  message: 'SPanel API is running',
  framework: 'Elysia',
  version: 'v0',
  timestamp: new Date().toISOString(),
  docs: '/api/swagger',
}), {
  detail: {
    tags: ['Health'],
    description: 'Get API information',
  },
})

// Mount controllers
app.use(userController)
app.use(nodeController)
app.use(adminController)
app.use(nodeHeartbeatController)
app.use(subscribeController)
app.use(userTicketController)
app.use(adminTicketController)

// Global error handler
app.onError(({ code, error, set }) => {
  console.error('Error:', error)

  if (code === 'VALIDATION') {
    set.status = 400
    return {
      error: 'Validation Error',
      message: error.message,
      details: error.all,
    }
  }

  if (code === 'NOT_FOUND') {
    set.status = 404
    return {
      error: 'Not Found',
      message: 'The requested resource was not found',
    }
  }

  set.status = 500
  return {
    error: 'Internal Server Error',
    message: error.message || 'An unexpected error occurred',
  }
})

// 404 handler
app.all('*', () => {
  return {
    error: 'Not Found',
    message: 'The requested resource was not found',
  }
})

// Start server
const port = parseInt(process.env.PORT || '3000')

console.log(`🚀 SPanel API server starting on port ${port}`)
console.log(`📚 Swagger documentation: http://localhost:${port}${app.config.prefix || ''}/swagger`)

app.listen(port)

console.log(`✅ Server is running on http://localhost:${port}`)

// Export App type for Eden Client
export type App = typeof app
