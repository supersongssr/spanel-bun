/**
 * User Controller - User Dashboard and Traffic Statistics
 *
 * Provides endpoints for:
 * - User profile information
 * - Traffic usage statistics
 * - Account details (money, class, etc.)
 * - Shop and billing system
 * - Subscription link management
 */

import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { verifyJWT } from '../lib/jwt'
import { generateUUID } from '../lib/password'

export const userController = new Elysia({ prefix: '/user' })

// ============================================================================
// SUBSCRIPTION SYSTEM
// ============================================================================

/**
 * GET /api/user/subscription
 *
 * Get user's subscription link
 *
 * Returns:
 * - Subscription token
 * - Full subscription URL for different clients
 * - Update URL
 */
userController.get('/subscription', async ({ set, request }) => {
  try {
    // Extract JWT from Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      }
    }

    const token = authHeader.substring(7)
    const payload = await verifyJWT(token)

    if (!payload) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      }
    }

    const userId = payload.userId

    // Check if user has a link token
    const existingLink = await prisma.link.findFirst({
      where: {
        userid: BigInt(userId),
      },
    })

    let linkToken = existingLink?.token

    // Create link if not exists
    if (!linkToken) {
      linkToken = generateUUID()
      await prisma.link.create({
        data: {
          userid: BigInt(userId),
          token: linkToken,
          type: 1,
          address: '',
          port: 0,
          ios: 0,
        },
      })
    }

    // Build subscription URLs
    const baseUrl = 'https://test-spanel-bun.freessr.bid'
    const subscribePath = `/api/subscribe/${linkToken}`

    return {
      token: linkToken,
      urls: {
        ss: `${baseUrl}${subscribePath}`,
        ssr: `${baseUrl}${subscribePath}?target=ssr`,
        v2ray: `${baseUrl}${subscribePath}?target=v2ray`,
        vmess: `${baseUrl}${subscribePath}?target=vmess`,
        trojan: `${baseUrl}${subscribePath}?target=trojan`,
        clash: `${baseUrl}${subscribePath}?target=clash`,
        surge: `${baseUrl}${subscribePath}?target=surge`,
      },
      updateUrl: `${baseUrl}${subscribePath}`,
    }
  } catch (error) {
    console.error('Get subscription error:', error)
    set.status = 500
    return {
      error: 'Internal Server Error',
      message: 'Failed to get subscription link',
    }
  }
}, {
  detail: {
    tags: ['User', 'Subscription'],
    description: 'Get user subscription link',
    security: [{ BearerAuth: [] }],
  },
})

/**
 * POST /api/user/subscription/reset
 *
 * Reset subscription token (invalidate old link)
 */
userController.post('/subscription/reset', async ({ set, request }) => {
  try {
    // Extract JWT from Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      }
    }

    const token = authHeader.substring(7)
    const payload = await verifyJWT(token)

    if (!payload) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      }
    }

    const userId = payload.userId

    // Delete old link
    await prisma.link.deleteMany({
      where: {
        userid: BigInt(userId),
      },
    })

    // Create new link
    const newToken = generateUUID()
    await prisma.link.create({
      data: {
        userid: BigInt(userId),
        token: newToken,
        type: 1,
        address: '',
        port: 0,
        ios: 0,
      },
    })

    const baseUrl = 'https://test-spanel-bun.freessr.bid'

    return {
      message: 'Subscription link reset successfully',
      token: newToken,
      url: `${baseUrl}/api/subscribe/${newToken}`,
    }
  } catch (error) {
    console.error('Reset subscription error:', error)
    set.status = 500
    return {
      error: 'Internal Server Error',
      message: 'Failed to reset subscription link',
    }
  }
}, {
  detail: {
    tags: ['User', 'Subscription'],
    description: 'Reset subscription link token',
    security: [{ BearerAuth: [] }],
  },
})

// ============================================================================
// SHOP & BILLING SYSTEM
// ============================================================================

/**
 * GET /api/user/shop
 *
 * Get list of available products for purchase
 *
 * Returns only products where status = 1 (active)
 */
userController.get('/shop', async ({ set }) => {
  try {
    const products = await prisma.shop.findMany({
      where: {
        status: 1, // Only show active products
      },
      orderBy: {
        id: 'asc',
      },
    })

    // Parse product content (stored as JSON/text in database)
    const formattedProducts = products.map((product) => {
      let content = {}
      try {
        content = JSON.parse(product.content)
      } catch (e) {
        // If content is not valid JSON, try to parse as key-value pairs
        const lines = product.content.split('\n')
        content = {}
        lines.forEach((line) => {
          const [key, ...valueParts] = line.split(':')
          if (key && valueParts.length > 0) {
            content[key.trim()] = valueParts.join(':').trim()
          }
        })
      }

      return {
        id: product.id,
        name: product.name,
        price: parseFloat(product.price.toString()),
        content: content,
        auto_renew: product.auto_renew === 1,
        auto_reset_bandwidth: product.auto_reset_bandwidth === 1,
        status: product.status === 1,
      }
    })

    return {
      products: formattedProducts,
    }
  } catch (error) {
    console.error('Get shop error:', error)
    set.status = 500
    return {
      error: 'Internal Server Error',
      message: 'Failed to fetch products',
    }
  }
}, {
  detail: {
    tags: ['User', 'Shop'],
    description: 'Get list of available products for purchase',
  },
})

/**
 * POST /api/user/buy
 *
 * Purchase a product using user balance
 *
 * Uses Prisma transaction to ensure atomicity:
 * 1. Check product exists and is active
 * 2. Check user has sufficient balance
 * 3. Deduct user balance
 * 4. Update user attributes (transfer_enable, class, expire_in)
 * 5. Create purchase record in Bought table
 *
 * All traffic values are in BYTES (1 GB = 1024^3 bytes)
 */
userController.post('/buy', async ({ set, request, body }) => {
  try {
    // Extract JWT from Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      }
    }

    const token = authHeader.substring(7)
    const payload = await verifyJWT(token)

    if (!payload) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      }
    }

    const userId = payload.userId
    const data = body as any
    const shopId = BigInt(data.shop_id)

    if (!shopId) {
      set.status = 400
      return {
        error: 'Bad Request',
        message: 'shop_id is required',
      }
    }

    // Execute transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check if product exists and is active
      const product = await tx.shop.findUnique({
        where: { id: shopId },
      })

      if (!product) {
        throw new Error('Product not found')
      }

      if (product.status !== 1) {
        throw new Error('Product is not available')
      }

      // 2. Get user and check balance
      const user = await tx.user.findUnique({
        where: { id: userId },
      })

      if (!user) {
        throw new Error('User not found')
      }

      const userBalance = parseFloat(user.money.toString())
      const productPrice = parseFloat(product.price.toString())

      if (userBalance < productPrice) {
        throw new Error('Insufficient balance')
      }

      // 3. Parse product content to determine what to update
      let content = {}
      try {
        content = JSON.parse(product.content)
      } catch (e) {
        // Parse as plain text key-value pairs
        const lines = product.content.split('\n')
        content = {}
        lines.forEach((line) => {
          const [key, ...valueParts] = line.split(':')
          if (key && valueParts.length > 0) {
            content[key.trim()] = valueParts.join(':').trim()
          }
        })
      }

      // Calculate updates based on product content
      const updateData: any = {}
      let trafficToAdd = BigInt(0)
      let classExpireDays = 0

      // Parse traffic (e.g., "100 GB" or "100GB")
      if (content.traffic || content.flow || content['流量']) {
        const trafficText = content.traffic || content.flow || content['流量'] || ''
        const match = trafficText.match(/(\d+(?:\.\d+)?)\s*(GB|GiB|MB|MiB|TB|TiB)?/i)

        if (match) {
          const value = parseFloat(match[1])
          const unit = (match[2] || 'GB').toUpperCase()

          // Convert to bytes
          const multipliers: Record<string, number> = {
            'GB': 1024 ** 3,
            'GIB': 1024 ** 3,
            'MB': 1024 ** 2,
            'MIB': 1024 ** 2,
            'TB': 1024 ** 4,
            'TIB': 1024 ** 4,
          }

          trafficToAdd = BigInt(Math.floor(value * (multipliers[unit] || multipliers['GB'])))
        }
      }

      // Parse class (VIP level)
      if (content.class || content['等级']) {
        const newClass = parseInt(content.class || content['等级'] || '0')
        // Class upgrade logic: use max of old and new class
        updateData.class = Math.max(user.class, newClass)
      }

      // Parse expire time (e.g., "30 days" or "30天")
      if (content.expire || content.expiry || content['有效期']) {
        const expireText = content.expire || content.expiry || content['有效期'] || ''
        const match = expireText.match(/(\d+)\s*(day|days|天)/i)

        if (match) {
          classExpireDays = parseInt(match[1])
        }
      }

      // 4. Deduct balance and update user
      const newBalance = userBalance - productPrice

      // Update transfer_enable (traffic is additive)
      if (trafficToAdd > 0) {
        updateData.transfer_enable = user.transfer_enable + trafficToAdd
      }

      // Update class_expire (extend if days specified)
      if (classExpireDays > 0) {
        const currentExpire = user.class_expire ? new Date(user.class_expire) : new Date()
        const newExpire = new Date(currentExpire.getTime() + classExpireDays * 24 * 60 * 60 * 1000)
        updateData.class_expire = newExpire
      }

      // Update expire_in (account expiration)
      if (content.expire_in || content['账户有效期']) {
        const expireInDays = parseInt(content.expire_in || content['账户有效期'] || '0')
        if (expireInDays > 0) {
          const currentExpireIn = user.expire_in ? new Date(user.expire_in) : new Date()
          const newExpireIn = new Date(currentExpireIn.getTime() + expireInDays * 24 * 60 * 60 * 1000)
          updateData.expire_in = newExpireIn
        }
      }

      updateData.money = newBalance

      // Update user
      await tx.user.update({
        where: { id: userId },
        data: updateData,
      })

      // 5. Create purchase record
      const now = BigInt(Math.floor(Date.now() / 1000))
      await tx.bought.create({
        data: {
          userid: BigInt(userId),
          shopid: product.id,
          datetime: now,
          renew: product.auto_renew,
          coupon: '',
          price: product.price,
        },
      })

      return {
        success: true,
        product: product.name,
        price: productPrice,
        newBalance: newBalance,
        trafficAdded: trafficToAdd.toString(),
        class: updateData.class,
      }
    })

    return {
      message: 'Purchase successful',
      ...result,
    }
  } catch (error: any) {
    console.error('Buy error:', error)

    if (error.message === 'Product not found') {
      set.status = 404
      return {
        error: 'Not Found',
        message: 'Product not found',
      }
    }

    if (error.message === 'Product is not available') {
      set.status = 400
      return {
        error: 'Bad Request',
        message: 'Product is not available',
      }
    }

    if (error.message === 'Insufficient balance') {
      set.status = 400
      return {
        error: 'Bad Request',
        message: 'Insufficient balance',
      }
    }

    set.status = 500
    return {
      error: 'Internal Server Error',
      message: 'Failed to complete purchase',
    }
  }
}, {
  body: t.Object({
    shop_id: t.String(),
  }),
  detail: {
    tags: ['User', 'Shop'],
    description: 'Purchase a product using user balance',
    security: [{ BearerAuth: [] }],
  },
})

/**
 * POST /api/user/redeem
 *
 * Redeem a code to add balance to user account
 *
 * Rate limiting: Prevents brute force code guessing
 * - Simple in-memory tracking (can be upgraded to Redis)
 */
userController.post('/redeem', async ({ set, request, body }) => {
  try {
    // Extract JWT from Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      }
    }

    const token = authHeader.substring(7)
    const payload = await verifyJWT(token)

    if (!payload) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      }
    }

    const userId = payload.userId
    const data = body as any
    const codeText = data.code?.trim()

    if (!codeText) {
      set.status = 400
      return {
        error: 'Bad Request',
        message: 'Code is required',
      }
    }

    // Simple rate limiting: Check recent redemptions by this user
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recentRedemptions = await prisma.code.count({
      where: {
        userid: BigInt(userId),
        usedatetime: {
          gte: oneHourAgo,
        },
      },
    })

    if (recentRedemptions >= 10) {
      set.status = 429
      return {
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Maximum 10 redemptions per hour.',
      }
    }

    // Execute transaction
    const result = await prisma.$transaction(async (tx) => {
      // Find the code
      const codeRecord = await tx.code.findFirst({
        where: {
          code: codeText,
        },
      })

      if (!codeRecord) {
        throw new Error('Invalid code')
      }

      if (codeRecord.isused === 1) {
        throw new Error('Code already used')
      }

      // Get user
      const user = await tx.user.findUnique({
        where: { id: userId },
      })

      if (!user) {
        throw new Error('User not found')
      }

      // Calculate new balance
      const currentBalance = parseFloat(user.money.toString())
      const codeAmount = parseFloat(codeRecord.number.toString())
      const newBalance = currentBalance + codeAmount

      // Update user balance
      await tx.user.update({
        where: { id: userId },
        data: {
          money: newBalance,
        },
      })

      // Mark code as used
      await tx.code.update({
        where: { id: codeRecord.id },
        data: {
          isused: 1,
          userid: BigInt(userId),
          usedatetime: new Date(),
        },
      })

      return {
        success: true,
        amount: codeAmount,
        newBalance: newBalance,
      }
    })

    return {
      message: 'Code redeemed successfully',
      ...result,
    }
  } catch (error: any) {
    console.error('Redeem error:', error)

    if (error.message === 'Invalid code') {
      set.status = 404
      return {
        error: 'Not Found',
        message: 'Invalid code',
      }
    }

    if (error.message === 'Code already used') {
      set.status = 400
      return {
        error: 'Bad Request',
        message: 'Code already used',
      }
    }

    set.status = 500
    return {
      error: 'Internal Server Error',
      message: 'Failed to redeem code',
    }
  }
}, {
  body: t.Object({
    code: t.String(),
  }),
  detail: {
    tags: ['User', 'Shop'],
    description: 'Redeem a code to add balance',
    security: [{ BearerAuth: [] }],
  },
})

/**
 * GET /api/user/info
 * 
 * Get current user profile and traffic summary
 * 
 * Authentication: Bearer token in Authorization header
 * 
 * Returns:
 * - User basic info (email, user_name, class)
 * - Traffic summary (total used, available, percentage)
 * - Account info (money, expire time)
 */
userController.get('/info', async ({ set, request }) => {
  try {
    // Extract JWT from Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      }
    }

    const token = authHeader.substring(7)
    const payload = await verifyJWT(token)

    if (!payload) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      }
    }

    const userId = payload.userId

    // Query user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        user_name: true,
        money: true,
        class: true,
        node_group: true,
        transfer_enable: true,  // Total traffic limit
        u: true,                // Upload bytes
        d: true,                // Download bytes
        last_day_t: true,       // Last checkin time
        expire_in: true,        // Account expiration
        node_speedlimit: true,
        method: true,
        protocol: true,
        obfs: true,
      },
    })

    if (!user) {
      set.status = 404
      return {
        error: 'Not Found',
        message: 'User not found',
      }
    }

    // Calculate traffic statistics
    const uploadBytes = Number(user.u)
    const downloadBytes = Number(user.d)
    const totalUsed = uploadBytes + downloadBytes
    const totalLimit = Number(user.transfer_enable)
    const availableBytes = totalLimit - totalUsed
    const usedPercent = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0

    return {
      user: {
        id: user.id,
        email: user.email,
        user_name: user.user_name,
        class: user.class,
        node_group: user.node_group,
      },
      traffic: {
        upload: user.u.toString(),          // Bytes as string (BigInt)
        download: user.d.toString(),        // Bytes as string (BigInt)
        total_used: totalUsed.toString(),   // Total used bytes
        transfer_enable: user.transfer_enable.toString(),  // Total limit
        available: availableBytes.toString(),
        used_percent: parseFloat(usedPercent.toFixed(2)),  // Percentage
      },
      account: {
        money: user.money,
        expire_in: user.expire_in,
        node_speedlimit: user.node_speedlimit,
        method: user.method,
        protocol: user.protocol,
        obfs: user.obfs,
      },
    }
  } catch (error) {
    console.error('User info error:', error)
    set.status = 500
    return {
      error: 'Internal Server Error',
      message: 'Failed to fetch user information',
    }
  }
}, {
  detail: {
    tags: ['User'],
    description: 'Get current user profile and traffic summary',
    security: [{ BearerAuth: [] }],
  },
})

/**
 * GET /api/user/traffic
 * 
 * Get detailed traffic statistics and history
 * 
 * Returns:
 * - Current usage breakdown
 * - Daily usage history (from user_traffic_log)
 * - Percentage used by time period
 */
userController.get('/traffic', async ({ set, request }) => {
  try {
    // Extract JWT from Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      }
    }

    const token = authHeader.substring(7)
    const payload = await verifyJWT(token)

    if (!payload) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      }
    }

    const userId = payload.userId

    // Query user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        u: true,
        d: true,
        transfer_enable: true,
        last_day_t: true,
      },
    })

    if (!user) {
      set.status = 404
      return {
        error: 'Not Found',
        message: 'User not found',
      }
    }

    // Calculate traffic
    const uploadBytes = Number(user.u)
    const downloadBytes = Number(user.d)
    const totalUsed = uploadBytes + downloadBytes
    const totalLimit = Number(user.transfer_enable)
    const usedPercent = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0

    // Get traffic log (last 7 days)
    // log_time is stored as Unix timestamp (Int)
    const sevenDaysAgoTimestamp = Math.floor((Date.now() / 1000) - (7 * 24 * 60 * 60))

    const trafficLogs = await prisma.user_traffic_log.findMany({
      where: {
        user_id: userId,
        log_time: {
          gte: sevenDaysAgoTimestamp,
        },
      },
      orderBy: {
        log_time: 'desc',
      },
      take: 7,
    })

    // Format traffic logs
    const dailyTraffic = trafficLogs.map((log) => {
      // Convert Unix timestamp to date string
      const date = new Date(log.log_time * 1000).toISOString().split('T')[0]
      const upload = Number(log.u)
      const download = Number(log.d)
      return {
        date: date,
        upload: upload.toString(),
        download: download.toString(),
        total: (upload + download).toString(),
      }
    })

    return {
      current: {
        upload: user.u.toString(),
        download: user.d.toString(),
        total_used: totalUsed.toString(),
        transfer_enable: user.transfer_enable.toString(),
        used_percent: parseFloat(usedPercent.toFixed(2)),
        remaining: (totalLimit - totalUsed).toString(),
      },
      daily_history: dailyTraffic || [],
      last_checkin: user.last_day_t ? user.last_day_t.toString() : null,
    }
  } catch (error) {
    console.error('Traffic stats error:', error)
    set.status = 500
    return {
      error: 'Internal Server Error',
      message: 'Failed to fetch traffic statistics',
    }
  }
}, {
  detail: {
    tags: ['User'],
    description: 'Get detailed traffic statistics and history',
    security: [{ BearerAuth: [] }],
  },
})
