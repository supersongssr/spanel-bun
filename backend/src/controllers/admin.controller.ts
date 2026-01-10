import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authMiddleware, adminMiddleware } from '../middleware/auth.js'
import { hashPassword, generateRandomString } from '../utils/hash.js'

const admin = new Hono()

// Apply auth and admin middleware to all routes
admin.use('*', authMiddleware)
admin.use('*', adminMiddleware)

/**
 * GET /admin/dashboard
 * Get admin dashboard stats
 */
admin.get('/dashboard', async (c) => {
  try {
    const [
      totalUsers,
      activeNodes,
      totalOrders,
      openTickets,
      todayTraffic,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.node.count({ where: { status: true } }),
      prisma.order.count(),
      prisma.ticket.count({ where: { status: 0 } }),
      prisma.trafficLog.aggregate({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        },
        _sum: { u: true, d: true }
      }),
    ])

    return c.json({
      message: 'Dashboard stats retrieved successfully',
      data: {
        totalUsers,
        activeNodes,
        totalOrders,
        openTickets,
        todayTraffic: (todayTraffic._sum.u || 0) + (todayTraffic._sum.d || 0),
      }
    })
  } catch (error) {
    console.error('Get dashboard error:', error)
    return c.json({
      error: 'Failed to get dashboard stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * GET /admin/users
 * Get users list with pagination
 */
admin.get('/users', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '20')
    const search = c.req.query('search') || ''

    const skip = (page - 1) * limit

    const where = search
      ? {
          OR: [
            { email: { contains: search } },
            { username: { contains: search } },
          ]
        }
      : {}

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          username: true,
          u: true,
          d: true,
          transferEnable: true,
          balance: true,
          isAdmin: true,
          isBanned: true,
          isEmailBanned: true,
          createdAt: true,
        },
        orderBy: { id: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where })
    ])

    return c.json({
      message: 'Users retrieved successfully',
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    console.error('Get users error:', error)
    return c.json({
      error: 'Failed to get users',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * GET /admin/users/:id
 * Get user details
 */
admin.get('/users/:id', async (c) => {
  try {
    const userId = parseInt(c.req.param('id'))

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        tickets: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        trafficLogs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        }
      }
    })

    if (!user) {
      return c.json({
        error: 'User not found',
        message: 'User does not exist'
      }, 404)
    }

    return c.json({
      message: 'User retrieved successfully',
      data: user
    })
  } catch (error) {
    console.error('Get user error:', error)
    return c.json({
      error: 'Failed to get user',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * PUT /admin/users/:id
 * Update user
 */
admin.put('/users/:id', zValidator('json', z.object({
  email: z.string().email().optional(),
  username: z.string().min(3).max(20).optional(),
  isAdmin: z.boolean().optional(),
  isBanned: z.boolean().optional(),
  isEmailBanned: z.boolean().optional(),
  bannedReason: z.string().optional(),
  balance: z.number().int().optional(),
  transferEnable: z.number().int().optional(),
  planId: z.number().int().optional(),
  userGroupId: z.number().int().optional(),
})), async (c) => {
  try {
    const userId = parseInt(c.req.param('id'))
    const body = c.req.valid('json')

    const user = await prisma.user.update({
      where: { id: userId },
      data: body
    })

    return c.json({
      message: 'User updated successfully',
      data: user
    })
  } catch (error) {
    console.error('Update user error:', error)
    return c.json({
      error: 'Failed to update user',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * DELETE /admin/users/:id
 * Delete user
 */
admin.delete('/users/:id', async (c) => {
  try {
    const userId = parseInt(c.req.param('id'))

    await prisma.user.delete({
      where: { id: userId }
    })

    return c.json({
      message: 'User deleted successfully'
    })
  } catch (error) {
    console.error('Delete user error:', error)
    return c.json({
      error: 'Failed to delete user',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * GET /admin/nodes
 * Get nodes list
 */
admin.get('/nodes', async (c) => {
  try {
    const nodes = await prisma.node.findMany({
      orderBy: { sortOrder: 'asc' },
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
 * POST /admin/nodes
 * Create node
 */
admin.post('/nodes', zValidator('json', z.object({
  name: z.string().min(1),
  server: z.string().min(1),
  type: z.number().int().default(1),
  protocol: z.string().default('shadowsocks'),
  info: z.string().optional(),
  host: z.string().optional(),
  method: z.string().default('aes-256-gcm'),
  rate: z.string().default('1.00'),
  status: z.boolean().default(true),
  muPort: z.number().int().optional(),
  muRegex: z.string().optional(),
  sortOrder: z.number().int().default(0),
})), async (c) => {
  try {
    const body = c.req.valid('json')

    const node = await prisma.node.create({
      data: body
    })

    return c.json({
      message: 'Node created successfully',
      data: node
    }, 201)
  } catch (error) {
    console.error('Create node error:', error)
    return c.json({
      error: 'Failed to create node',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * PUT /admin/nodes/:id
 * Update node
 */
admin.put('/nodes/:id', zValidator('json', z.object({
  name: z.string().min(1).optional(),
  server: z.string().min(1).optional(),
  type: z.number().int().optional(),
  protocol: z.string().optional(),
  info: z.string().optional(),
  host: z.string().optional(),
  method: z.string().optional(),
  rate: z.string().optional(),
  status: z.boolean().optional(),
  muPort: z.number().int().optional(),
  muRegex: z.string().optional(),
  sortOrder: z.number().int().optional(),
})), async (c) => {
  try {
    const nodeId = parseInt(c.req.param('id'))
    const body = c.req.valid('json')

    const node = await prisma.node.update({
      where: { id: nodeId },
      data: body
    })

    return c.json({
      message: 'Node updated successfully',
      data: node
    })
  } catch (error) {
    console.error('Update node error:', error)
    return c.json({
      error: 'Failed to update node',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * DELETE /admin/nodes/:id
 * Delete node
 */
admin.delete('/nodes/:id', async (c) => {
  try {
    const nodeId = parseInt(c.req.param('id'))

    await prisma.node.delete({
      where: { id: nodeId }
    })

    return c.json({
      message: 'Node deleted successfully'
    })
  } catch (error) {
    console.error('Delete node error:', error)
    return c.json({
      error: 'Failed to delete node',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * GET /admin/tickets
 * Get all tickets
 */
admin.get('/tickets', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '20')
    const status = c.req.query('status') ? parseInt(c.req.query('status')) : undefined

    const skip = (page - 1) * limit

    const where = status !== undefined ? { status } : {}

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.ticket.count({ where })
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
 * GET /admin/tickets/:id
 * Get ticket details
 */
admin.get('/tickets/:id', async (c) => {
  try {
    const ticketId = parseInt(c.req.param('id'))

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          }
        }
      }
    })

    if (!ticket) {
      return c.json({
        error: 'Ticket not found',
        message: 'Ticket does not exist'
      }, 404)
    }

    return c.json({
      message: 'Ticket retrieved successfully',
      data: ticket
    })
  } catch (error) {
    console.error('Get ticket error:', error)
    return c.json({
      error: 'Failed to get ticket',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * PUT /admin/tickets/:id
 * Reply to ticket
 */
admin.put('/tickets/:id', zValidator('json', z.object({
  reply: z.string().min(1),
  status: z.number().int().min(0).max(2).optional(),
})), async (c) => {
  try {
    const ticketId = parseInt(c.req.param('id'))
    const body = c.req.valid('json')

    const ticket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        reply: body.reply,
        status: body.status !== undefined ? body.status : 1,
        replyAt: new Date(),
      }
    })

    return c.json({
      message: 'Ticket replied successfully',
      data: ticket
    })
  } catch (error) {
    console.error('Reply ticket error:', error)
    return c.json({
      error: 'Failed to reply ticket',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * GET /admin/orders
 * Get orders
 */
admin.get('/orders', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '20')
    const status = c.req.query('status') ? parseInt(c.req.query('status')) : undefined

    const skip = (page - 1) * limit

    const where = status !== undefined ? { status } : {}

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
            }
          },
          plan: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where })
    ])

    return c.json({
      message: 'Orders retrieved successfully',
      data: {
        orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    console.error('Get orders error:', error)
    return c.json({
      error: 'Failed to get orders',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * GET /admin/plans
 * Get plans
 */
admin.get('/plans', async (c) => {
  try {
    const plans = await prisma.plan.findMany({
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
 * POST /admin/plans
 * Create plan
 */
admin.post('/plans', zValidator('json', z.object({
  name: z.string().min(1),
  content: z.string().optional(),
  monthlyPrice: z.number().int().min(0),
  quarterlyPrice: z.number().int().min(0),
  halfYearPrice: z.number().int().min(0),
  yearlyPrice: z.number().int().min(0),
  transferEnable: z.number().int().min(0),
  speedLimit: z.number().int().min(0),
  nodeGroupId: z.number().int().optional(),
  nodeGroup: z.string().optional(),
  isActive: z.boolean().default(true),
})), async (c) => {
  try {
    const body = c.req.valid('json')

    const plan = await prisma.plan.create({
      data: body
    })

    return c.json({
      message: 'Plan created successfully',
      data: plan
    }, 201)
  } catch (error) {
    console.error('Create plan error:', error)
    return c.json({
      error: 'Failed to create plan',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * PUT /admin/plans/:id
 * Update plan
 */
admin.put('/plans/:id', zValidator('json', z.object({
  name: z.string().min(1).optional(),
  content: z.string().optional(),
  monthlyPrice: z.number().int().min(0).optional(),
  quarterlyPrice: z.number().int().min(0).optional(),
  halfYearPrice: z.number().int().min(0).optional(),
  yearlyPrice: z.number().int().min(0).optional(),
  transferEnable: z.number().int().min(0).optional(),
  speedLimit: z.number().int().min(0).optional(),
  nodeGroupId: z.number().int().optional(),
  nodeGroup: z.string().optional(),
  isActive: z.boolean().optional(),
})), async (c) => {
  try {
    const planId = parseInt(c.req.param('id'))
    const body = c.req.valid('json')

    const plan = await prisma.plan.update({
      where: { id: planId },
      data: body
    })

    return c.json({
      message: 'Plan updated successfully',
      data: plan
    })
  } catch (error) {
    console.error('Update plan error:', error)
    return c.json({
      error: 'Failed to update plan',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * DELETE /admin/plans/:id
 * Delete plan
 */
admin.delete('/plans/:id', async (c) => {
  try {
    const planId = parseInt(c.req.param('id'))

    await prisma.plan.delete({
      where: { id: planId }
    })

    return c.json({
      message: 'Plan deleted successfully'
    })
  } catch (error) {
    console.error('Delete plan error:', error)
    return c.json({
      error: 'Failed to delete plan',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * GET /admin/shop
 * Get shop items
 */
admin.get('/shop', async (c) => {
  try {
    const shopItems = await prisma.shopItem.findMany({
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
 * POST /admin/shop
 * Create shop item
 */
admin.post('/shop', zValidator('json', z.object({
  name: z.string().min(1),
  content: z.string().optional(),
  price: z.number().int().min(0),
  traffic: z.number().int().min(0),
  status: z.boolean().default(true),
  autoResetNode: z.boolean().default(false),
  nodeId: z.number().int().optional(),
})), async (c) => {
  try {
    const body = c.req.valid('json')

    const shopItem = await prisma.shopItem.create({
      data: body
    })

    return c.json({
      message: 'Shop item created successfully',
      data: shopItem
    }, 201)
  } catch (error) {
    console.error('Create shop item error:', error)
    return c.json({
      error: 'Failed to create shop item',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * PUT /admin/shop/:id
 * Update shop item
 */
admin.put('/shop/:id', zValidator('json', z.object({
  name: z.string().min(1).optional(),
  content: z.string().optional(),
  price: z.number().int().min(0).optional(),
  traffic: z.number().int().min(0).optional(),
  status: z.boolean().optional(),
  autoResetNode: z.boolean().optional(),
  nodeId: z.number().int().optional(),
})), async (c) => {
  try {
    const itemId = parseInt(c.req.param('id'))
    const body = c.req.valid('json')

    const shopItem = await prisma.shopItem.update({
      where: { id: itemId },
      data: body
    })

    return c.json({
      message: 'Shop item updated successfully',
      data: shopItem
    })
  } catch (error) {
    console.error('Update shop item error:', error)
    return c.json({
      error: 'Failed to update shop item',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * DELETE /admin/shop/:id
 * Delete shop item
 */
admin.delete('/shop/:id', async (c) => {
  try {
    const itemId = parseInt(c.req.param('id'))

    await prisma.shopItem.delete({
      where: { id: itemId }
    })

    return c.json({
      message: 'Shop item deleted successfully'
    })
  } catch (error) {
    console.error('Delete shop item error:', error)
    return c.json({
      error: 'Failed to delete shop item',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * GET /admin/notices
 * Get notices
 */
admin.get('/notices', async (c) => {
  try {
    const notices = await prisma.notice.findMany({
      orderBy: { priority: 'desc' },
    })

    return c.json({
      message: 'Notices retrieved successfully',
      data: notices
    })
  } catch (error) {
    console.error('Get notices error:', error)
    return c.json({
      error: 'Failed to get notices',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * POST /admin/notices
 * Create notice
 */
admin.post('/notices', zValidator('json', z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  priority: z.number().int().default(0),
  isActive: z.boolean().default(true),
})), async (c) => {
  try {
    const body = c.req.valid('json')

    const notice = await prisma.notice.create({
      data: body
    })

    return c.json({
      message: 'Notice created successfully',
      data: notice
    }, 201)
  } catch (error) {
    console.error('Create notice error:', error)
    return c.json({
      error: 'Failed to create notice',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * PUT /admin/notices/:id
 * Update notice
 */
admin.put('/notices/:id', zValidator('json', z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  priority: z.number().int().optional(),
  isActive: z.boolean().optional(),
})), async (c) => {
  try {
    const noticeId = parseInt(c.req.param('id'))
    const body = c.req.valid('json')

    const notice = await prisma.notice.update({
      where: { id: noticeId },
      data: body
    })

    return c.json({
      message: 'Notice updated successfully',
      data: notice
    })
  } catch (error) {
    console.error('Update notice error:', error)
    return c.json({
      error: 'Failed to update notice',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * DELETE /admin/notices/:id
 * Delete notice
 */
admin.delete('/notices/:id', async (c) => {
  try {
    const noticeId = parseInt(c.req.param('id'))

    await prisma.notice.delete({
      where: { id: noticeId }
    })

    return c.json({
      message: 'Notice deleted successfully'
    })
  } catch (error) {
    console.error('Delete notice error:', error)
    return c.json({
      error: 'Failed to delete notice',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * GET /admin/codes
 * Get codes (invite/recharge codes)
 */
admin.get('/codes', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '20')

    const skip = (page - 1) * limit

    const [codes, total] = await Promise.all([
      prisma.code.findMany({
        orderBy: { id: 'desc' },
        skip,
        take: limit,
      }),
      prisma.code.count()
    ])

    return c.json({
      message: 'Codes retrieved successfully',
      data: {
        codes,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    console.error('Get codes error:', error)
    return c.json({
      error: 'Failed to get codes',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * POST /admin/codes
 * Create code
 */
admin.post('/codes', zValidator('json', z.object({
  code: z.string().min(1),
  type: z.number().int().min(1).max(2),
  value: z.number().int().min(0),
  userId: z.number().int().optional(),
  maxUseCount: z.number().int().min(0).default(1),
  isActive: z.boolean().default(true),
  expireTime: z.number().int().optional(),
})), async (c) => {
  try {
    const body = c.req.valid('json')

    const code = await prisma.code.create({
      data: body
    })

    return c.json({
      message: 'Code created successfully',
      data: code
    }, 201)
  } catch (error) {
    console.error('Create code error:', error)
    return c.json({
      error: 'Failed to create code',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * GET /admin/traffic
 * Get traffic logs
 */
admin.get('/traffic', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '50')

    const skip = (page - 1) * limit

    const [logs, total] = await Promise.all([
      prisma.trafficLog.findMany({
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
            }
          },
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
      prisma.trafficLog.count()
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

export default admin
