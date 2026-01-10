import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authMiddleware, adminMiddleware } from '../middleware/auth.js'

const node = new Hono()

/**
 * GET /node/list
 * Get node list (public or authenticated)
 */
node.get('/list', async (c) => {
  try {
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
 * GET /node/:id
 * Get node details
 */
node.get('/:id', async (c) => {
  try {
    const nodeId = parseInt(c.req.param('id'))

    const node = await prisma.node.findUnique({
      where: { id: nodeId },
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
        muPort: true,
        muRegex: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    if (!node) {
      return c.json({
        error: 'Node not found',
        message: 'Node does not exist'
      }, 404)
    }

    return c.json({
      message: 'Node retrieved successfully',
      data: node
    })
  } catch (error) {
    console.error('Get node error:', error)
    return c.json({
      error: 'Failed to get node',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * POST /node/mu/users/:id/traffic
 * Mu API - Report user traffic
 * Note: This should be secured with mu key in production
 */
node.post('/mu/users/:id/traffic', zValidator('json', z.object({
  u: z.number().int().min(0),
  d: z.number().int().min(0),
})), async (c) => {
  try {
    const userId = parseInt(c.req.param('id'))
    const body = c.req.valid('json')

    // TODO: Verify mu key from headers or env
    // const muKey = c.req.header('X-Mu-Key')
    // if (muKey !== process.env.MU_KEY) {
    //   return c.json({ error: 'Unauthorized' }, 401)
    // }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return c.json({
        error: 'User not found',
        message: 'User does not exist'
      }, 404)
    }

    // Update user traffic
    await prisma.user.update({
      where: { id: userId },
      data: {
        u: { increment: body.u },
        d: { increment: body.d },
      }
    })

    // Create traffic log
    await prisma.trafficLog.create({
      data: {
        userId,
        nodeId: 0, // Will be updated with actual node ID
        u: body.u,
        d: body.d,
        rate: 1.0,
        timestamp: Math.floor(Date.now() / 1000),
      }
    })

    return c.json({
      message: 'Traffic reported successfully',
      data: {
        userId,
        u: body.u,
        d: body.d,
      }
    })
  } catch (error) {
    console.error('Report traffic error:', error)
    return c.json({
      error: 'Failed to report traffic',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * POST /node/mu/nodes/:id/info
 * Mu API - Report node info
 */
node.post('/mu/nodes/:id/info', zValidator('json', z.object({
  load: z.string().optional(),
  onlineUserCount: z.number().int().min(0).optional(),
})), async (c) => {
  try {
    const nodeId = parseInt(c.req.param('id'))
    const body = c.req.valid('json')

    // TODO: Verify mu key

    const node = await prisma.node.update({
      where: { id: nodeId },
      data: {
        ...(body.load !== undefined && { load: body.load }),
        ...(body.onlineUserCount !== undefined && { onlineUserCount: body.onlineUserCount }),
        isOnline: true,
      }
    })

    return c.json({
      message: 'Node info updated successfully',
      data: node
    })
  } catch (error) {
    console.error('Update node info error:', error)
    return c.json({
      error: 'Failed to update node info',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * POST /node/mu/nodes/:id/online
 * Mu API - Report online users
 */
node.post('/mu/nodes/:id/online', zValidator('json', z.object({
  count: z.number().int().min(0),
})), async (c) => {
  try {
    const nodeId = parseInt(c.req.param('id'))
    const body = c.req.valid('json')

    // TODO: Verify mu key

    await prisma.node.update({
      where: { id: nodeId },
      data: {
        onlineUserCount: body.count,
        isOnline: true,
      }
    })

    return c.json({
      message: 'Online users reported successfully',
      data: {
        nodeId,
        count: body.count
      }
    })
  } catch (error) {
    console.error('Report online users error:', error)
    return c.json({
      error: 'Failed to report online users',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Admin routes below - require admin auth

/**
 * POST /node
 * Create node (admin only)
 */
node.post('/', authMiddleware, adminMiddleware, zValidator('json', z.object({
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
 * PUT /node/:id
 * Update node (admin only)
 */
node.put('/:id', authMiddleware, adminMiddleware, zValidator('json', z.object({
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
 * DELETE /node/:id
 * Delete node (admin only)
 */
node.delete('/:id', authMiddleware, adminMiddleware, async (c) => {
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

export default node
