import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const auth = new Hono()

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(3).max(20),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

// Routes
auth.post('/register', zValidator('json', registerSchema), async (c) => {
  const body = c.req.valid('json')

  // TODO: Implement registration logic
  // 1. Check if user exists
  // 2. Hash password
  // 3. Create user in database
  // 4. Generate JWT token

  return c.json({
    message: 'Registration endpoint',
    data: body
  }, 201)
})

auth.post('/login', zValidator('json', loginSchema), async (c) => {
  const body = c.req.valid('json')

  // TODO: Implement login logic
  // 1. Find user by email
  // 2. Verify password
  // 3. Generate JWT token
  // 4. Return token

  return c.json({
    message: 'Login endpoint',
    data: body
  })
})

auth.post('/logout', async (c) => {
  // TODO: Implement logout logic
  // 1. Invalidate token (Redis blacklist)
  // 2. Clear session

  return c.json({
    message: 'Logged out successfully'
  })
})

auth.post('/reset-password', async (c) => {
  // TODO: Implement password reset logic
  // 1. Generate reset token
  // 2. Send email
  // 3. Verify token
  // 4. Update password

  return c.json({
    message: 'Password reset endpoint'
  })
})

auth.post('/send-verification', async (c) => {
  // TODO: Implement email verification logic
  // 1. Generate verification code
  // 2. Send email
  // 3. Store code in Redis

  return c.json({
    message: 'Verification email sent'
  })
})

export default auth
