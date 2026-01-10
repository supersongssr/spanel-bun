import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { hashPassword, verifyPassword, generateRandomString } from '../utils/hash.js'
import { generateToken } from '../utils/jwt.js'
import { setCache, deleteCache } from '../lib/redis.js'

const auth = new Hono()

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  inviteCode: z.string().optional(),
})

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
})

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
})

const sendVerificationSchema = z.object({
  email: z.string().email('Invalid email format'),
})

/**
 * POST /auth/register
 * Register a new user
 */
auth.post('/register', zValidator('json', registerSchema), async (c) => {
  try {
    const body = c.req.valid('json')

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: body.email },
          { username: body.username }
        ]
      }
    })

    if (existingUser) {
      if (existingUser.email === body.email) {
        return c.json({
          error: 'Email already exists',
          message: 'An account with this email already exists'
        }, 400)
      }
      return c.json({
        error: 'Username already exists',
        message: 'This username is already taken'
      }, 400)
    }

    // Verify invite code if provided
    if (body.inviteCode) {
      const inviteCode = await prisma.code.findUnique({
        where: { code: body.inviteCode }
      })

      if (!inviteCode || !inviteCode.isActive) {
        return c.json({
          error: 'Invalid invite code',
          message: 'The invite code is invalid or expired'
        }, 400)
      }

      if (inviteCode.maxUseCount > 0 && inviteCode.useCount >= inviteCode.maxUseCount) {
        return c.json({
          error: 'Invite code exhausted',
          message: 'This invite code has reached its maximum usage'
        }, 400)
      }

      // Update invite code usage
      await prisma.code.update({
        where: { id: inviteCode.id },
        data: {
          useCount: { increment: 1 }
        }
      })
    }

    // Hash password
    const hashedPassword = await hashPassword(body.password)

    // Generate user token and uuid
    const token = generateRandomString(32)
    const uuid = generateRandomString(36)

    // Create user
    const user = await prisma.user.create({
      data: {
        email: body.email,
        username: body.username,
        password: hashedPassword,
        token,
        uuid,
        transferEnable: 0, // Default traffic limit
      }
    })

    // Generate JWT token
    const jwtToken = await generateToken({
      userId: user.id,
      email: user.email,
      isAdmin: user.isAdmin
    })

    return c.json({
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
        token: jwtToken
      }
    }, 201)
  } catch (error) {
    console.error('Register error:', error)
    return c.json({
      error: 'Registration failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * POST /auth/login
 * Login user
 */
auth.post('/login', zValidator('json', loginSchema), async (c) => {
  try {
    const body = c.req.valid('json')

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: body.email }
    })

    if (!user) {
      return c.json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      }, 401)
    }

    // Check if user is banned
    if (user.isBanned || user.isEmailBanned) {
      return c.json({
        error: 'Account banned',
        message: user.bannedReason || 'Your account has been banned'
      }, 403)
    }

    // Verify password
    const isValidPassword = await verifyPassword(body.password, user.password)
    if (!isValidPassword) {
      return c.json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      }, 401)
    }

    // Generate JWT token
    const jwtToken = await generateToken({
      userId: user.id,
      email: user.email,
      isAdmin: user.isAdmin
    })

    return c.json({
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          isAdmin: user.isAdmin,
        },
        token: jwtToken
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    return c.json({
      error: 'Login failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * POST /auth/logout
 * Logout user (add token to blacklist)
 */
auth.post('/logout', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      // Add token to blacklist with 7 day expiration
      await setCache(`blacklist:${token}`, true, 604800)
    }

    return c.json({
      message: 'Logged out successfully'
    })
  } catch (error) {
    return c.json({
      error: 'Logout failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * POST /auth/reset-password/request
 * Request password reset
 */
auth.post('/reset-password/request', zValidator('json', sendVerificationSchema), async (c) => {
  try {
    const body = c.req.valid('json')

    const user = await prisma.user.findUnique({
      where: { email: body.email }
    })

    if (!user) {
      // Don't reveal if email exists or not
      return c.json({
        message: 'If the email exists, a reset link has been sent'
      })
    }

    // Generate reset token
    const resetToken = generateRandomString(32)

    // Store reset token in Redis with 1 hour expiration
    await setCache(`reset:${resetToken}`, user.id, 3600)

    // TODO: Send email with reset link
    // await sendPasswordResetEmail(user.email, resetToken)

    return c.json({
      message: 'If the email exists, a reset link has been sent',
      data: {
        resetToken // Only for development, remove in production
      }
    })
  } catch (error) {
    console.error('Reset password request error:', error)
    return c.json({
      error: 'Reset request failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * POST /auth/reset-password/confirm
 * Confirm password reset with token
 */
auth.post('/reset-password/confirm', zValidator('json', resetPasswordSchema), async (c) => {
  try {
    const body = c.req.valid('json')

    // Verify reset token
    const { getCache } = await import('../lib/redis.js')
    const userId = await getCache<number>(`reset:${body.token}`)

    if (!userId) {
      return c.json({
        error: 'Invalid or expired token',
        message: 'The reset token is invalid or has expired'
      }, 400)
    }

    // Hash new password
    const hashedPassword = await hashPassword(body.newPassword)

    // Update user password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    })

    // Delete reset token
    await deleteCache(`reset:${body.token}`)

    return c.json({
      message: 'Password reset successfully'
    })
  } catch (error) {
    console.error('Reset password confirm error:', error)
    return c.json({
      error: 'Reset failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * POST /auth/send-verification
 * Send email verification code
 */
auth.post('/send-verification', zValidator('json', sendVerificationSchema), async (c) => {
  try {
    const body = c.req.valid('json')

    const user = await prisma.user.findUnique({
      where: { email: body.email }
    })

    if (!user) {
      return c.json({
        message: 'If the email exists, a verification code has been sent'
      })
    }

    if (user.emailVerified) {
      return c.json({
        message: 'Email is already verified'
      })
    }

    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString()

    // Store code in Redis with 5 minute expiration
    await setCache(`verify:${user.id}`, code, 300)

    // TODO: Send email with verification code
    // await sendVerificationEmail(user.email, code)

    return c.json({
      message: 'If the email exists, a verification code has been sent',
      data: {
        code // Only for development, remove in production
      }
    })
  } catch (error) {
    console.error('Send verification error:', error)
    return c.json({
      error: 'Send verification failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * POST /auth/verify-email
 * Verify email with code
 */
auth.post('/verify-email', zValidator('json', z.object({
  email: z.string().email(),
  code: z.string().length(6)
})), async (c) => {
  try {
    const body = c.req.valid('json')

    const user = await prisma.user.findUnique({
      where: { email: body.email }
    })

    if (!user) {
      return c.json({
        error: 'User not found',
        message: 'No user found with this email'
      }, 404)
    }

    // Verify code
    const { getCache } = await import('../lib/redis.js')
    const storedCode = await getCache<string>(`verify:${user.id}`)

    if (storedCode !== body.code) {
      return c.json({
        error: 'Invalid code',
        message: 'The verification code is incorrect or expired'
      }, 400)
    }

    // Mark email as verified
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true }
    })

    // Delete verification code
    await deleteCache(`verify:${user.id}`)

    return c.json({
      message: 'Email verified successfully'
    })
  } catch (error) {
    console.error('Verify email error:', error)
    return c.json({
      error: 'Verification failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

export default auth
