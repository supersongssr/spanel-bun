/**
 * Authentication Controller
 * Handles user registration and login
 */

import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { hashPassword, verifyPassword, generateUUID } from '../lib/password'

export const authController = new Elysia({ prefix: '/auth' })

/**
 * POST /api/auth/register
 * Register a new user
 */
authController.post('/register', async ({ body, set }) => {
  try {
    const { email, username, password, inviteCode } = body

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email || undefined },
          { username: username || undefined },
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

    // Validate invite code if provided
    if (inviteCode) {
      const code = await prisma.inviteCode.findUnique({
        where: { code: inviteCode },
      })

      if (!code || code.status !== 1) {
        set.status = 400
        return {
          error: 'Bad Request',
          message: 'Invalid or expired invite code',
        }
      }

      if (code.usedUserId) {
        set.status = 400
        return {
          error: 'Bad Request',
          message: 'Invite code already used',
        }
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Generate UUID
    const uuid = generateUUID()

    // Allocate random port (11111-55555)
    const port = Math.floor(Math.random() * (55555 - 11111 + 1)) + 11111

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email || null,
        username: username || null,
        password: hashedPassword,
        uuid: uuid,
        port: port,
        transferEnable: BigInt(10 * 1024 * 1024 * 1024), // 10 GB default
        class: 0,
        nodeSpeedlimit: BigInt(0), // No limit
        regIp: body.ip || null,
        money: 0,
        refBy: 0,
        refByCount: 0,
        isAdmin: false,
        isAgent: false,
        isBanned: false,
        isEmailBanned: false,
        theme: 'material',
        method: 'chacha20-ietf-poly1305',
        protocol: 'origin',
        obfs: 'plain',
      },
    })

    // Mark invite code as used
    if (inviteCode) {
      await prisma.inviteCode.update({
        where: { id: (await prisma.inviteCode.findUnique({ where: { code: inviteCode } }))!.id },
        data: {
          usedUserId: user.id,
          usedAt: Math.floor(Date.now() / 1000),
          status: 0,
        },
      })
    }

    // Return user info (exclude password)
    const { password: _, ...userWithoutPassword } = user

    set.status = 201
    return {
      message: 'User registered successfully',
      user: userWithoutPassword,
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
    username: t.String({ minLength: 3, maxLength: 32 }),
    password: t.String({ minLength: 6, maxLength: 64 }),
    inviteCode: t.Optional(t.String()),
    ip: t.Optional(t.String()),
  }),
  detail: {
    tags: ['Auth'],
    description: 'Register a new user',
    responses: {
      201: 'User registered successfully',
      400: 'Bad request - user exists or invalid invite code',
      500: 'Internal server error',
    },
  },
})

/**
 * POST /api/auth/login
 * Login user and return JWT token
 */
authController.post('/login', async ({ body, jwt, set }) => {
  try {
    const { email, username, password } = body

    // Find user by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email || undefined },
          { username: username || undefined },
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

    // Check if user is banned
    if (user.isBanned || user.isEmailBanned) {
      set.status = 403
      return {
        error: 'Forbidden',
        message: user.bannedReason || 'Account is banned',
      }
    }

    // Verify password (supports both legacy and bcrypt)
    const isValid = await verifyPassword(password, user.password || user.pass || '')

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
      username: user.username,
      isAdmin: user.isAdmin,
    })

    // Return user info and token
    const { password: _, pass: __, ...userWithoutPassword } = user

    return {
      message: 'Login successful',
      token: token,
      user: userWithoutPassword,
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
    username: t.Optional(t.String()),
    password: t.String(),
  }),
  detail: {
    tags: ['Auth'],
    description: 'Login with email/username and password',
    responses: {
      200: 'Login successful',
      401: 'Invalid credentials',
      403: 'Account is banned',
      500: 'Internal server error',
    },
  },
})

/**
 * GET /api/auth/me
 * Get current user info (requires JWT)
 */
authController.get('/me', async ({ jwt, set, request }) => {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      }
    }

    const token = authHeader.substring(7)

    // Verify JWT
    const payload = await jwt.verify(token)

    if (!payload) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'Invalid token',
      }
    }

    // Get user from database
    const userId = (payload as any).userId as number
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      set.status = 404
      return {
        error: 'Not Found',
        message: 'User not found',
      }
    }

    // Return user info (exclude password)
    const { password: _, pass: __, ...userWithoutPassword } = user

    return userWithoutPassword
  } catch (error) {
    console.error('Get user error:', error)
    set.status = 500
    return {
      error: 'Internal Server Error',
      message: 'Failed to get user info',
    }
  }
}, {
  detail: {
    tags: ['Auth'],
    description: 'Get current authenticated user info',
    security: [{ BearerAuth: [] }],
    responses: {
      200: 'User info retrieved',
      401: 'Unauthorized',
      404: 'User not found',
      500: 'Internal server error',
    },
  },
})
