import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authMiddleware } from '../middleware/auth.js'
import { hashPassword, verifyPassword, generateRandomString } from '../utils/hash.js'
import { setCache } from '../lib/redis.js'

const user = new Hono()

// Apply auth middleware to all routes
user.use('*', authMiddleware)

/**
 * GET /user/info
 * Get current user info
 */
user.get('/info', async (c) => {
  try {
    const userId = c.get('userId')

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        emailVerified: true,
        u: true,
        d: true,
        transferEnable: true,
        lastCheckinTime: true,
        expireTime: true,
        userGroupId: true,
        planId: true,
        theme: true,
        isAdmin: true,
        isAgent: true,
        isBanned: true,
        isEmailBanned: true,
        bannedReason: true,
        refBy: true,
        refCount: true,
        balance: true,
        token: true,
        uuid: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    if (!user) {
      return c.json({
        error: 'User not found',
        message: 'User does not exist'
      }, 404)
    }

    return c.json({
      message: 'User info retrieved successfully',
      data: user
    })
  } catch (error) {
    console.error('Get user info error:', error)
    return c.json({
      error: 'Failed to get user info',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * GET /user/dashboard
 * Get user dashboard data (stats, announcements, etc)
 */
user.get('/dashboard', async (c) => {
  try {
    const userId = c.get('userId')

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        orders: {
          where: { status: 1 },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        tickets: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        }
      }
    })

    if (!user) {
      return c.json({
        error: 'User not found',
        message: 'User does not exist'
      }, 404)
    }

    // Get active announcements
    const notices = await prisma.notice.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' },
      take: 5,
    })

    // Calculate traffic usage
    const totalTraffic = user.u + user.d
    const trafficPercent = user.transferEnable > 0
      ? Math.round((totalTraffic / user.transferEnable) * 100)
      : 0

    // Get available nodes
    const nodes = await prisma.node.findMany({
      where: { status: true },
      orderBy: { sortOrder: 'asc' },
    })

    return c.json({
      message: 'Dashboard data retrieved successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          balance: user.balance,
          transferEnable: user.transferEnable,
          u: user.u,
          d: user.d,
          totalTraffic,
          trafficPercent,
          lastCheckinTime: user.lastCheckinTime,
          expireTime: user.expireTime,
        },
        orders: user.orders,
        tickets: user.tickets,
        notices,
        nodes,
      }
    })
  } catch (error) {
    console.error('Get dashboard error:', error)
    return c.json({
      error: 'Failed to get dashboard data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * POST /user/checkin
 * Daily check-in
 */
user.post('/checkin', async (c) => {
  try {
    const userId = c.get('userId')

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return c.json({
        error: 'User not found',
        message: 'User does not exist'
      }, 404)
    }

    // Check if already checked in today
    const today = Math.floor(Date.now() / 86400000)
    const lastCheckinDay = user.lastCheckinTime
      ? Math.floor(user.lastCheckinTime / 86400000)
      : 0

    if (lastCheckinDay === today) {
      return c.json({
        error: 'Already checked in',
        message: 'You have already checked in today'
      }, 400)
    }

    // Calculate reward (random between 10-100 MB)
    const reward = Math.floor(Math.random() * 90 + 10) * 1024 * 1024

    // Update user
    await prisma.user.update({
      where: { id: userId },
      data: {
        transferEnable: { increment: reward },
        lastCheckinTime: Date.now(),
      }
    })

    return c.json({
      message: 'Check-in successful',
      data: {
        reward,
        totalTransferEnable: user.transferEnable + reward
      }
    })
  } catch (error) {
    console.error('Check-in error:', error)
    return c.json({
      error: 'Check-in failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * PUT /user/profile
 * Update user profile
 */
user.put('/profile', zValidator('json', z.object({
  username: z.string().min(3).max(20).optional(),
  theme: z.string().optional(),
})), async (c) => {
  try {
    const userId = c.get('userId')
    const body = c.req.valid('json')

    // Check if username is taken by another user
    if (body.username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username: body.username,
          NOT: { id: userId }
        }
      })

      if (existingUser) {
        return c.json({
          error: 'Username taken',
          message: 'This username is already taken'
        }, 400)
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: body,
      select: {
        id: true,
        email: true,
        username: true,
        theme: true,
      }
    })

    return c.json({
      message: 'Profile updated successfully',
      data: user
    })
  } catch (error) {
    console.error('Update profile error:', error)
    return c.json({
      error: 'Failed to update profile',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * POST /user/password
 * Change password
 */
user.post('/password', zValidator('json', z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8),
})), async (c) => {
  try {
    const userId = c.get('userId')
    const body = c.req.valid('json')

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return c.json({
        error: 'User not found',
        message: 'User does not exist'
      }, 404)
    }

    // Verify old password
    const isValidPassword = await verifyPassword(body.oldPassword, user.password)
    if (!isValidPassword) {
      return c.json({
        error: 'Invalid password',
        message: 'Old password is incorrect'
      }, 401)
    }

    // Hash new password
    const hashedPassword = await hashPassword(body.newPassword)

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    })

    return c.json({
      message: 'Password changed successfully'
    })
  } catch (error) {
    console.error('Change password error:', error)
    return c.json({
      error: 'Failed to change password',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * GET /user/nodes
 * Get available nodes for user
 */
user.get('/nodes', async (c) => {
  try {
    const userId = c.get('userId')

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { planId: true, userGroupId: true }
    })

    if (!user) {
      return c.json({
        error: 'User not found',
        message: 'User does not exist'
      }, 404)
    }

    // Get active nodes
    const nodes = await prisma.node.findMany({
      where: { status: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        server: true,
        type: true,
        protocol: true,
        info: true,
        host: true,
        method: true,
        rate: true,
        isOnline: true,
        onlineUserCount: true,
        load: true,
        sortOrder: true,
      }
    })

    return c.json({
      message: 'Nodes retrieved successfully',
      data: nodes
    })
  } catch (error) {
    console.error('Get nodes error:', error)
    return c.json({
      error: 'Failed to get nodes',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * GET /user/subscribe
 * Get subscription link
 */
user.get('/subscribe', async (c) => {
  try {
    const userId = c.get('userId')

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        token: true,
        uuid: true,
        planId: true,
      }
    })

    if (!user) {
      return c.json({
        error: 'User not found',
        message: 'User does not exist'
      }, 404)
    }

    const baseUrl = process.env.BASE_URL || 'https://test-spanel-bun.freessr.bid'
    const subscribeUrl = `${baseUrl}/api/subscribe/${user.token}`

    return c.json({
      message: 'Subscribe link retrieved successfully',
      data: {
        subscribeUrl,
        token: user.token,
        uuid: user.uuid,
      }
    })
  } catch (error) {
    console.error('Get subscribe error:', error)
    return c.json({
      error: 'Failed to get subscribe link',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * GET /user/traffic
 * Get traffic logs
 */
user.get('/traffic', async (c) => {
  try {
    const userId = c.get('userId')
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '20')

    const skip = (page - 1) * limit

    const [logs, total] = await Promise.all([
      prisma.trafficLog.findMany({
        where: { userId },
        include: {
          node: {
            select: {
              id: true,
              name: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.trafficLog.count({ where: { userId } })
    ])

    return c.json({
      message: 'Traffic logs retrieved successfully',
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    console.error('Get traffic logs error:', error)
    return c.json({
      error: 'Failed to get traffic logs',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * GET /user/tickets
 * Get user tickets
 */
user.get('/tickets', async (c) => {
  try {
    const userId = c.get('userId')
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '20')

    const skip = (page - 1) * limit

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.ticket.count({ where: { userId } })
    ])

    return c.json({
      message: 'Tickets retrieved successfully',
      data: {
        tickets,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    console.error('Get tickets error:', error)
    return c.json({
      error: 'Failed to get tickets',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * POST /user/tickets
 * Create a new ticket
 */
user.post('/tickets', zValidator('json', z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
})), async (c) => {
  try {
    const userId = c.get('userId')
    const body = c.req.valid('json')

    const ticket = await prisma.ticket.create({
      data: {
        userId,
        title: body.title,
        content: body.content,
        status: 0, // Open
      }
    })

    return c.json({
      message: 'Ticket created successfully',
      data: ticket
    }, 201)
  } catch (error) {
    console.error('Create ticket error:', error)
    return c.json({
      error: 'Failed to create ticket',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * PUT /user/tickets/:id
 * Update ticket
 */
user.put('/tickets/:id', zValidator('json', z.object({
  content: z.string().min(1).optional(),
  status: z.number().int().min(0).max(2).optional(),
})), async (c) => {
  try {
    const userId = c.get('userId')
    const ticketId = parseInt(c.req.param('id'))
    const body = c.req.valid('json')

    // Check if ticket belongs to user
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        userId
      }
    })

    if (!ticket) {
      return c.json({
        error: 'Ticket not found',
        message: 'Ticket does not exist or does not belong to you'
      }, 404)
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        ...body,
        replyAt: body.content ? new Date() : ticket.replyAt,
      }
    })

    return c.json({
      message: 'Ticket updated successfully',
      data: updatedTicket
    })
  } catch (error) {
    console.error('Update ticket error:', error)
    return c.json({
      error: 'Failed to update ticket',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * GET /user/shop
 * Get shop items
 */
user.get('/shop', async (c) => {
  try {
    const shopItems = await prisma.shopItem.findMany({
      where: { status: true },
      orderBy: { id: 'asc' },
    })

    return c.json({
      message: 'Shop items retrieved successfully',
      data: shopItems
    })
  } catch (error) {
    console.error('Get shop items error:', error)
    return c.json({
      error: 'Failed to get shop items',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * POST /user/shop/:id/buy
 * Buy shop item
 */
user.post('/shop/:id/buy', async (c) => {
  try {
    const userId = c.get('userId')
    const itemId = parseInt(c.req.param('id'))

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return c.json({
        error: 'User not found',
        message: 'User does not exist'
      }, 404)
    }

    const shopItem = await prisma.shopItem.findUnique({
      where: { id: itemId }
    })

    if (!shopItem || !shopItem.status) {
      return c.json({
        error: 'Item not found',
        message: 'Shop item does not exist or is not available'
      }, 404)
    }

    // Check if user has enough balance
    if (user.balance < shopItem.price) {
      return c.json({
        error: 'Insufficient balance',
        message: 'You do not have enough balance to purchase this item'
      }, 400)
    }

    // Process purchase
    await prisma.$transaction([
      // Deduct balance
      prisma.user.update({
        where: { id: userId },
        data: { balance: { decrement: shopItem.price } }
      }),
      // Add traffic if applicable
      shopItem.traffic > 0
        ? prisma.user.update({
            where: { id: userId },
            data: { transferEnable: { increment: shopItem.traffic } }
          })
        : null,
    ].filter(Boolean))

    return c.json({
      message: 'Item purchased successfully',
      data: {
        item: shopItem,
        remainingBalance: user.balance - shopItem.price
      }
    })
  } catch (error) {
    console.error('Buy item error:', error)
    return c.json({
      error: 'Failed to buy item',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * POST /user/invite/reset
 * Reset invite code
 */
user.post('/invite/reset', async (c) => {
  try {
    const userId = c.get('userId')

    const newToken = generateRandomString(32)

    await prisma.user.update({
      where: { id: userId },
      data: { token: newToken }
    })

    const baseUrl = process.env.BASE_URL || 'https://test-spanel-bun.freessr.bid'
    const inviteUrl = `${baseUrl}/auth/register?invite=${newToken}`

    return c.json({
      message: 'Invite code reset successfully',
      data: {
        token: newToken,
        inviteUrl
      }
    })
  } catch (error) {
    console.error('Reset invite error:', error)
    return c.json({
      error: 'Failed to reset invite code',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * GET /user/plans
 * Get available plans
 */
user.get('/plans', async (c) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    })

    return c.json({
      message: 'Plans retrieved successfully',
      data: plans
    })
  } catch (error) {
    console.error('Get plans error:', error)
    return c.json({
      error: 'Failed to get plans',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * POST /user/orders
 * Create order
 */
user.post('/orders', zValidator('json', z.object({
  planId: z.number().int(),
  paymentMethod: z.enum(['alipay', 'wechat', 'balance']),
})), async (c) => {
  try {
    const userId = c.get('userId')
    const body = c.req.valid('json')

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return c.json({
        error: 'User not found',
        message: 'User does not exist'
      }, 404)
    }

    const plan = await prisma.plan.findUnique({
      where: { id: body.planId }
    })

    if (!plan || !plan.isActive) {
      return c.json({
        error: 'Plan not found',
        message: 'Plan does not exist or is not available'
      }, 404)
    }

    // Determine price based on duration
    let amount = 0
    // Default to monthly price
    amount = plan.monthlyPrice

    if (body.paymentMethod === 'balance') {
      if (user.balance < amount) {
        return c.json({
          error: 'Insufficient balance',
          message: 'You do not have enough balance'
        }, 400)
      }

      // Create paid order
      const order = await prisma.order.create({
        data: {
          userId,
          planId: body.planId,
          status: 1, // Paid
          amount,
          paymentMethod: body.paymentMethod,
        }
      })

      // Deduct balance and update user transfer
      await prisma.user.update({
        where: { id: userId },
        data: {
          balance: { decrement: amount },
          transferEnable: { increment: plan.transferEnable }
        }
      })

      return c.json({
        message: 'Order created and paid successfully',
        data: order
      }, 201)
    } else {
      // Create unpaid order
      const order = await prisma.order.create({
        data: {
          userId,
          planId: body.planId,
          status: 0, // Unpaid
          amount,
          paymentMethod: body.paymentMethod,
        }
      })

      // TODO: Generate payment QR code
      return c.json({
        message: 'Order created successfully',
        data: {
          order,
          // qrCode: '...' // Payment QR code
        }
      }, 201)
    }
  } catch (error) {
    console.error('Create order error:', error)
    return c.json({
      error: 'Failed to create order',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

export default user
