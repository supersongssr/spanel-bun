/**
 * Admin Controller - Admin Panel APIs
 *
 * Provides endpoints for:
 * - Site-wide statistics
 * - User management (list, search, edit)
 * - Shop and billing management
 * - Code generation and management
 * - System configuration
 */

import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { verifyJWT } from '../lib/jwt'

export const adminController = new Elysia({ prefix: '/admin' })

// Heartbeat token for node status reporting (should be in env vars)
const NODE_HEARTBEAT_TOKEN = process.env.NODE_HEARTBEAT_TOKEN || 'change-this-node-heartbeat-token-in-production'

/**
 * GET /api/admin/stats
 * 
 * Get site-wide statistics
 * 
 * Authentication: Bearer token with admin privileges
 * 
 * Returns:
 * - Total users count
 * - Total nodes count
 * - Today's new users
 * - Total traffic usage
 */
adminController.get('/stats', async ({ set, request }) => {
  try {
    // Extract and verify JWT (admin check is handled by middleware)
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

    console.log('Admin Stats API - Payload:', JSON.stringify(payload))

    if (!payload || !payload.isAdmin) {
      set.status = 403
      return {
        error: 'Forbidden',
        message: 'Admin privileges required',
      }
    }

    // Get total users count
    const totalUsers = await prisma.user.count()

    // Get total nodes count
    const totalNodes = await prisma.ss_node.count()

    // Get today's new users
    // reg_date is DateTime type in database
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const newUsersToday = await prisma.user.count({
      where: {
        reg_date: {
          gte: today,
          lt: tomorrow,
        },
      },
    })

    // Get total traffic usage (sum of all users' u + d)
    const trafficResult = await prisma.user.aggregate({
      _sum: {
        u: true,
        d: true,
      },
    })

    const totalUpload = trafficResult._sum.u || BigInt(0)
    const totalDownload = trafficResult._sum.d || BigInt(0)
    const totalTraffic = totalUpload + totalDownload

    // Get online nodes count
    const onlineNodes = await prisma.ss_node.count({
      where: {
        node_online: 1,
      },
    })

    return {
      users: {
        total: totalUsers,
        newToday: newUsersToday,
      },
      nodes: {
        total: totalNodes,
        online: onlineNodes,
      },
      traffic: {
        totalUpload: totalUpload.toString(),
        totalDownload: totalDownload.toString(),
        totalTraffic: totalTraffic.toString(),
      },
    }
  } catch (error) {
    console.error('Admin stats error:', error)
    set.status = 500
    return {
      error: 'Internal Server Error',
      message: 'Failed to fetch statistics',
    }
  }
}, {
  detail: {
    tags: ['Admin'],
    description: 'Get site-wide statistics (admin only)',
    security: [{ BearerAuth: [] }],
  },
})

/**
 * GET /api/admin/users
 * 
 * Get user list with pagination and search
 * 
 * Query parameters:
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 20)
 * - search: Search by email or username (optional)
 * 
 * Authentication: Bearer token with admin privileges
 */
adminController.get('/users', async ({ set, request, query }) => {
  try {
    // Verify admin
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

    if (!payload || !payload.isAdmin) {
      set.status = 403
      return {
        error: 'Forbidden',
        message: 'Admin privileges required',
      }
    }

    // Parse query parameters
    const params = query as any
    const page = parseInt(params.page) || 1
    const pageSize = Math.min(parseInt(params.pageSize) || 20, 100) // Max 100 per page
    const search = params.search || ''

    // Build where clause
    const where: any = {}
    
    if (search) {
      where.OR = [
        { email: { contains: search } },
        { user_name: { contains: search } },
      ]
    }

    // Get total count
    const total = await prisma.user.count({ where })

    // Get users with pagination
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        user_name: true,
        money: true,
        class: true,
        node_group: true,
        transfer_enable: true,
        u: true,
        d: true,
        reg_date: true,
        expire_in: true,
        is_admin: true,
        method: true,
        protocol: true,
        obfs: true,
      },
      orderBy: {
        id: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    // Format users
    const formattedUsers = users.map((user: any) => ({
      id: user.id,
      email: user.email,
      user_name: user.user_name,
      money: user.money,
      class: user.class,
      node_group: user.node_group,
      transfer_enable: user.transfer_enable.toString(),
      used_upload: user.u.toString(),
      used_download: user.d.toString(),
      used_total: (Number(user.u) + Number(user.d)).toString(),
      reg_date: user.reg_date,
      expire_in: user.expire_in,
      is_admin: user.is_admin === 1,
      method: user.method,
      protocol: user.protocol,
      obfs: user.obfs,
    }))

    return {
      users: formattedUsers,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  } catch (error) {
    console.error('Admin users list error:', error)
    set.status = 500
    return {
      error: 'Internal Server Error',
      message: 'Failed to fetch users',
    }
  }
}, {
  detail: {
    tags: ['Admin'],
    description: 'Get user list with pagination and search (admin only)',
    security: [{ BearerAuth: [] }],
  },
})

/**
 * GET /api/admin/users/:id
 * 
 * Get detailed user information by ID
 * 
 * Authentication: Bearer token with admin privileges
 */
adminController.get('/users/:id', async ({ set, request, params }) => {
  try {
    // Verify admin
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

    if (!payload || !payload.isAdmin) {
      set.status = 403
      return {
        error: 'Forbidden',
        message: 'Admin privileges required',
      }
    }

    const userId = parseInt(params.id)

    if (isNaN(userId)) {
      set.status = 400
      return {
        error: 'Bad Request',
        message: 'Invalid user ID',
      }
    }

    // Get user
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

    return {
      id: user.id,
      email: user.email,
      user_name: user.user_name,
      money: user.money,
      class: user.class,
      node_group: user.node_group,
      transfer_enable: user.transfer_enable.toString(),
      u: user.u.toString(),
      d: user.d.toString(),
      port: user.port,
      pass: '***', // Hide password
      reg_date: user.reg_date,
      reg_ip: user.reg_ip,
      expire_in: user.expire_in,
      is_admin: user.is_admin === 1,
      method: user.method,
      protocol: user.protocol,
      obfs: user.obfs,
      node_speedlimit: user.node_speedlimit,
    }
  } catch (error) {
    console.error('Admin user detail error:', error)
    set.status = 500
    return {
      error: 'Internal Server Error',
      message: 'Failed to fetch user details',
    }
  }
}, {
  detail: {
    tags: ['Admin'],
    description: 'Get detailed user information (admin only)',
    security: [{ BearerAuth: [] }],
  },
})

/**
 * PUT /api/admin/users/:id
 * 
 * Update user information
 * 
 * Sensitive fields filtering:
 * - Cannot modify own is_admin field
 * - Cannot modify user_id (id)
 * - Password cannot be viewed (hidden as '***')
 * 
 * Authentication: Bearer token with admin privileges
 */
adminController.put('/users/:id', async ({ set, request, params, body }) => {
  try {
    // Verify admin
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

    if (!payload || !payload.isAdmin) {
      set.status = 403
      return {
        error: 'Forbidden',
        message: 'Admin privileges required',
      }
    }

    const adminUserId = payload.userId
    const targetUserId = parseInt(params.id)

    if (isNaN(targetUserId)) {
      set.status = 400
      return {
        error: 'Bad Request',
        message: 'Invalid user ID',
      }
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    })

    if (!existingUser) {
      set.status = 404
      return {
        error: 'Not Found',
        message: 'User not found',
      }
    }

    // Parse request body
    const updateData = body as any

    // Security check: Prevent admin from modifying their own admin status
    if (targetUserId === adminUserId && updateData.is_admin !== undefined) {
      set.status = 403
      return {
        error: 'Forbidden',
        message: 'Cannot modify your own admin privileges',
      }
    }

    // Filter sensitive fields
    const allowedFields = [
      'email',
      'user_name',
      'money',
      'class',
      'node_group',
      'transfer_enable',
      'u',
      'd',
      'expire_in',
      'method',
      'protocol',
      'obfs',
      'node_speedlimit',
      'is_admin',
    ]

    // Build update data object (only include allowed fields)
    const dataToUpdate: any = {}
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        // Convert is_admin boolean to integer
        if (field === 'is_admin') {
          dataToUpdate[field] = updateData[field] ? 1 : 0
        } else if (field === 'transfer_enable' || field === 'u' || field === 'd') {
          // Convert traffic fields to BigInt
          dataToUpdate[field] = BigInt(updateData[field])
        } else {
          dataToUpdate[field] = updateData[field]
        }
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: dataToUpdate,
    })

    return {
      message: 'User updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        user_name: updatedUser.user_name,
        money: updatedUser.money,
        class: updatedUser.class,
        node_group: updatedUser.node_group,
        transfer_enable: updatedUser.transfer_enable.toString(),
        is_admin: updatedUser.is_admin === 1,
      },
    }
  } catch (error) {
    console.error('Admin user update error:', error)
    set.status = 500
    return {
      error: 'Internal Server Error',
      message: 'Failed to update user',
    }
  }
}, {
  body: t.Object({
    email: t.Optional(t.String({ format: 'email' })),
    user_name: t.Optional(t.String()),
    money: t.Optional(t.Number()),
    class: t.Optional(t.Number()),
    node_group: t.Optional(t.Number()),
    transfer_enable: t.Optional(t.String()),
    u: t.Optional(t.String()),
    d: t.Optional(t.String()),
    expire_in: t.Optional(t.String()),
    method: t.Optional(t.String()),
    protocol: t.Optional(t.String()),
    obfs: t.Optional(t.String()),
    node_speedlimit: t.Optional(t.Number()),
    is_admin: t.Optional(t.Boolean()),
  }),
  detail: {
    tags: ['Admin'],
    description: 'Update user information (admin only)',
    security: [{ BearerAuth: [] }],
  },
})

// ============================================================================
// SHOP & BILLING MANAGEMENT API
// ============================================================================

/**
 * GET /api/admin/shop
 *
 * Get list of all products (admin view, includes inactive)
 */
adminController.get('/shop', async ({ set, request, query }) => {
  try {
    // Verify admin
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

    if (!payload || !payload.isAdmin) {
      set.status = 403
      return {
        error: 'Forbidden',
        message: 'Admin privileges required',
      }
    }

    // Parse query parameters
    const params = query as any
    const page = parseInt(params.page) || 1
    const pageSize = Math.min(parseInt(params.pageSize) || 20, 100)
    const status = params.status

    // Build where clause
    const where: any = {}
    if (status !== undefined) {
      where.status = status === '1' ? 1 : 0
    }

    // Get total count
    const total = await prisma.shop.count({ where })

    // Get products with pagination
    const products = await prisma.shop.findMany({
      where,
      orderBy: {
        id: 'asc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    // Format products
    const formattedProducts = products.map((product: any) => {
      let content = {}
      try {
        content = JSON.parse(product.content)
      } catch (e) {
        const lines = product.content.split('\n')
        content = {}
        lines.forEach((line: string) => {
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
        content_raw: product.content,
        auto_renew: product.auto_renew === 1,
        auto_reset_bandwidth: product.auto_reset_bandwidth === 1,
        status: product.status === 1,
      }
    })

    return {
      products: formattedProducts,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  } catch (error) {
    console.error('Admin shop list error:', error)
    set.status = 500
    return {
      error: 'Internal Server Error',
      message: 'Failed to fetch products',
    }
  }
}, {
  detail: {
    tags: ['Admin', 'Shop'],
    description: 'Get list of all products (admin only)',
    security: [{ BearerAuth: [] }],
  },
})

/**
 * POST /api/admin/shop
 *
 * Create a new product
 */
adminController.post('/shop', async ({ set, request, body }) => {
  try {
    // Verify admin
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

    if (!payload || !payload.isAdmin) {
      set.status = 403
      return {
        error: 'Forbidden',
        message: 'Admin privileges required',
      }
    }

    const data = body as any

    // Validate required fields
    if (!data.name || data.price === undefined) {
      set.status = 400
      return {
        error: 'Bad Request',
        message: 'Missing required fields: name, price',
      }
    }

    // Build content object
    const contentObj: any = {}
    if (data.content) {
      // If content is already a string, use it directly
      if (typeof data.content === 'string') {
        contentObj.raw = data.content
      } else {
        // Build content from individual fields
        if (data.traffic) contentObj.traffic = data.traffic
        if (data.class !== undefined) contentObj.class = data.class
        if (data.expire) contentObj.expire = data.expire
        if (data.node_group !== undefined) contentObj.node_group = data.node_group
      }
    }

    // Serialize content
    let contentText = ''
    if (typeof data.content === 'string') {
      contentText = data.content
    } else {
      contentText = JSON.stringify(contentObj)
    }

    // Create product
    const product = await prisma.shop.create({
      data: {
        name: data.name,
        price: parseFloat(data.price.toString()),
        content: contentText,
        auto_renew: data.auto_renew ? 1 : 0,
        auto_reset_bandwidth: data.auto_reset_bandwidth ? 1 : 0,
        status: data.status !== undefined ? (data.status ? 1 : 0) : 1,
      },
    })

    return {
      message: 'Product created successfully',
      product: {
        id: product.id,
        name: product.name,
        price: parseFloat(product.price.toString()),
      },
    }
  } catch (error) {
    console.error('Admin shop create error:', error)
    set.status = 500
    return {
      error: 'Internal Server Error',
      message: 'Failed to create product',
    }
  }
}, {
  body: t.Object({
    name: t.String(),
    price: t.Number(),
    content: t.Optional(t.Union([t.String(), t.Object({})])),
    auto_renew: t.Optional(t.Boolean()),
    auto_reset_bandwidth: t.Optional(t.Boolean()),
    status: t.Optional(t.Boolean()),
  }),
  detail: {
    tags: ['Admin', 'Shop'],
    description: 'Create a new product (admin only)',
    security: [{ BearerAuth: [] }],
  },
})

/**
 * PUT /api/admin/shop/:id
 *
 * Update a product
 */
adminController.put('/shop/:id', async ({ set, request, params, body }) => {
  try {
    // Verify admin
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

    if (!payload || !payload.isAdmin) {
      set.status = 403
      return {
        error: 'Forbidden',
        message: 'Admin privileges required',
      }
    }

    const productId = BigInt(params.id)

    if (!productId) {
      set.status = 400
      return {
        error: 'Bad Request',
        message: 'Invalid product ID',
      }
    }

    // Check if product exists
    const existingProduct = await prisma.shop.findUnique({
      where: { id: productId },
    })

    if (!existingProduct) {
      set.status = 404
      return {
        error: 'Not Found',
        message: 'Product not found',
      }
    }

    const data = body as any

    // Build content object
    let contentText = existingProduct.content
    if (data.content !== undefined) {
      if (typeof data.content === 'string') {
        contentText = data.content
      } else {
        contentText = JSON.stringify(data.content)
      }
    }

    // Update product
    const updateData: any = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.price !== undefined) updateData.price = parseFloat(data.price.toString())
    if (data.content !== undefined) updateData.content = contentText
    if (data.auto_renew !== undefined) updateData.auto_renew = data.auto_renew ? 1 : 0
    if (data.auto_reset_bandwidth !== undefined) updateData.auto_reset_bandwidth = data.auto_reset_bandwidth ? 1 : 0
    if (data.status !== undefined) updateData.status = data.status ? 1 : 0

    const product = await prisma.shop.update({
      where: { id: productId },
      data: updateData,
    })

    return {
      message: 'Product updated successfully',
      product: {
        id: product.id,
        name: product.name,
        price: parseFloat(product.price.toString()),
      },
    }
  } catch (error) {
    console.error('Admin shop update error:', error)
    set.status = 500
    return {
      error: 'Internal Server Error',
      message: 'Failed to update product',
    }
  }
}, {
  body: t.Object({
    name: t.Optional(t.String()),
    price: t.Optional(t.Number()),
    content: t.Optional(t.Union([t.String(), t.Object({})])),
    auto_renew: t.Optional(t.Boolean()),
    auto_reset_bandwidth: t.Optional(t.Boolean()),
    status: t.Optional(t.Boolean()),
  }),
  detail: {
    tags: ['Admin', 'Shop'],
    description: 'Update a product (admin only)',
    security: [{ BearerAuth: [] }],
  },
})

/**
 * DELETE /api/admin/shop/:id
 *
 * Delete a product
 */
adminController.delete('/shop/:id', async ({ set, request, params }) => {
  try {
    // Verify admin
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

    if (!payload || !payload.isAdmin) {
      set.status = 403
      return {
        error: 'Forbidden',
        message: 'Admin privileges required',
      }
    }

    const productId = BigInt(params.id)

    if (!productId) {
      set.status = 400
      return {
        error: 'Bad Request',
        message: 'Invalid product ID',
      }
    }

    // Check if product exists
    const existingProduct = await prisma.shop.findUnique({
      where: { id: productId },
    })

    if (!existingProduct) {
      set.status = 404
      return {
        error: 'Not Found',
        message: 'Product not found',
      }
    }

    // Delete product
    await prisma.shop.delete({
      where: { id: productId },
    })

    return {
      message: 'Product deleted successfully',
    }
  } catch (error) {
    console.error('Admin shop delete error:', error)
    set.status = 500
    return {
      error: 'Internal Server Error',
      message: 'Failed to delete product',
    }
  }
}, {
  detail: {
    tags: ['Admin', 'Shop'],
    description: 'Delete a product (admin only)',
    security: [{ BearerAuth: [] }],
  },
})

/**
 * GET /api/admin/bought
 *
 * Get purchase history with pagination
 */
adminController.get('/bought', async ({ set, request, query }) => {
  try {
    // Verify admin
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

    if (!payload || !payload.isAdmin) {
      set.status = 403
      return {
        error: 'Forbidden',
        message: 'Admin privileges required',
      }
    }

    // Parse query parameters
    const params = query as any
    const page = parseInt(params.page) || 1
    const pageSize = Math.min(parseInt(params.pageSize) || 20, 100)

    // Get total count
    const total = await prisma.bought.count()

    // Get purchase records with pagination
    const records = await prisma.bought.findMany({
      orderBy: {
        datetime: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    // Get user and product details
    const formattedRecords = await Promise.all(
      records.map(async (record: any) => {
        const user = await prisma.user.findUnique({
          where: { id: Number(record.userid) },
          select: {
            id: true,
            email: true,
            user_name: true,
          },
        })

        const product = await prisma.shop.findUnique({
          where: { id: record.shopid },
          select: {
            id: true,
            name: true,
            price: true,
          },
        })

        return {
          id: record.id,
          user: user ? {
            id: user.id,
            email: user.email,
            user_name: user.user_name,
          } : null,
          product: product ? {
            id: product.id,
            name: product.name,
            price: parseFloat(product.price.toString()),
          } : null,
          price: parseFloat(record.price.toString()),
          datetime: record.datetime ? new Date(parseInt(record.datetime.toString()) * 1000) : null,
          renew: record.renew === 1,
          coupon: record.coupon,
        }
      })
    )

    return {
      records: formattedRecords,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  } catch (error) {
    console.error('Admin bought list error:', error)
    set.status = 500
    return {
      error: 'Internal Server Error',
      message: 'Failed to fetch purchase history',
    }
  }
}, {
  detail: {
    tags: ['Admin', 'Billing'],
    description: 'Get purchase history (admin only)',
    security: [{ BearerAuth: [] }],
  },
})

/**
 * GET /api/admin/codes
 *
 * Get list of codes with pagination and filters
 */
adminController.get('/codes', async ({ set, request, query }) => {
  try {
    // Verify admin
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

    if (!payload || !payload.isAdmin) {
      set.status = 403
      return {
        error: 'Forbidden',
        message: 'Admin privileges required',
      }
    }

    // Parse query parameters
    const params = query as any
    const page = parseInt(params.page) || 1
    const pageSize = Math.min(parseInt(params.pageSize) || 20, 100)
    const isused = params.isused

    // Build where clause
    const where: any = {}
    if (isused !== undefined) {
      where.isused = isused === 'true' ? 1 : 0
    }

    // Get total count
    const total = await prisma.code.count({ where })

    // Get codes with pagination
    const codes = await prisma.code.findMany({
      where,
      orderBy: {
        id: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    // Format codes
    const formattedCodes = await Promise.all(
      codes.map(async (code: any) => {
        let usedBy = null
        if (code.isused === 1 && code.userid) {
          const user = await prisma.user.findUnique({
            where: { id: Number(code.userid) },
            select: {
              id: true,
              email: true,
              user_name: true,
            },
          })
          usedBy = user
        }

        return {
          id: code.id,
          code: code.code,
          type: code.type,
          number: parseFloat(code.number.toString()),
          isused: code.isused === 1,
          usedBy: usedBy ? {
            id: usedBy.id,
            email: usedBy.email,
            user_name: usedBy.user_name,
          } : null,
          usedatetime: code.usedatetime,
        }
      })
    )

    return {
      codes: formattedCodes,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  } catch (error) {
    console.error('Admin codes list error:', error)
    set.status = 500
    return {
      error: 'Internal Server Error',
      message: 'Failed to fetch codes',
    }
  }
}, {
  detail: {
    tags: ['Admin', 'Billing'],
    description: 'Get list of codes (admin only)',
    security: [{ BearerAuth: [] }],
  },
})

/**
 * POST /api/admin/codes/generate
 *
 * Generate batch codes
 *
 * Body:
 * - count: Number of codes to generate
 * - amount: Amount per code
 * - type: Code type (optional)
 */
adminController.post('/codes/generate', async ({ set, request, body }) => {
  try {
    // Verify admin
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

    if (!payload || !payload.isAdmin) {
      set.status = 403
      return {
        error: 'Forbidden',
        message: 'Admin privileges required',
      }
    }

    const data = body as any

    // Validate
    const count = parseInt(data.count) || 1
    const amount = parseFloat(data.amount) || 0
    const type = parseInt(data.type) || 1

    if (count <= 0 || count > 1000) {
      set.status = 400
      return {
        error: 'Bad Request',
        message: 'Count must be between 1 and 1000',
      }
    }

    if (amount <= 0) {
      set.status = 400
      return {
        error: 'Bad Request',
        message: 'Amount must be greater than 0',
      }
    }

    // Generate random codes
    const generateCode = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No I, O, 0, 1 to avoid confusion
      let code = ''
      for (let i = 0; i < 16; i++) {
        if (i > 0 && i % 4 === 0) code += '-'
        code += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return code
    }

    // Batch create codes
    const codesToCreate = []
    for (let i = 0; i < count; i++) {
      codesToCreate.push({
        code: generateCode(),
        type: type,
        number: amount,
        isused: 0,
        userid: BigInt(0),
      })
    }

    await prisma.code.createMany({
      data: codesToCreate,
    })

    return {
      message: 'Codes generated successfully',
      count: count,
      amount: amount,
    }
  } catch (error) {
    console.error('Admin codes generate error:', error)
    set.status = 500
    return {
      error: 'Internal Server Error',
      message: 'Failed to generate codes',
    }
  }
}, {
  body: t.Object({
    count: t.Number(),
    amount: t.Number(),
    type: t.Optional(t.Number()),
  }),
  detail: {
    tags: ['Admin', 'Billing'],
    description: 'Generate batch codes (admin only)',
    security: [{ BearerAuth: [] }],
  },
})

/**
 * DELETE /api/admin/codes/:id
 *
 * Delete a code
 */
adminController.delete('/codes/:id', async ({ set, request, params }) => {
  try {
    // Verify admin
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

    if (!payload || !payload.isAdmin) {
      set.status = 403
      return {
        error: 'Forbidden',
        message: 'Admin privileges required',
      }
    }

    const codeId = BigInt(params.id)

    if (!codeId) {
      set.status = 400
      return {
        error: 'Bad Request',
        message: 'Invalid code ID',
      }
    }

    // Check if code exists
    const existingCode = await prisma.code.findUnique({
      where: { id: codeId },
    })

    if (!existingCode) {
      set.status = 404
      return {
        error: 'Not Found',
        message: 'Code not found',
      }
    }

    // Delete code
    await prisma.code.delete({
      where: { id: codeId },
    })

    return {
      message: 'Code deleted successfully',
    }
  } catch (error) {
    console.error('Admin code delete error:', error)
    set.status = 500
    return {
      error: 'Internal Server Error',
      message: 'Failed to delete code',
    }
  }
}, {
  detail: {
    tags: ['Admin', 'Billing'],
    description: 'Delete a code (admin only)',
    security: [{ BearerAuth: [] }],
  },
})

// ============================================================================
// NODE MANAGEMENT API
// ============================================================================

/**
 * GET /api/admin/nodes
 *
 * Get list of all nodes (admin only)
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 20)
 * - status: Filter by status (online/offline/all, default: all)
 */
adminController.get('/nodes', async ({ set, request, query }) => {
  try {
    // Verify admin
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

    if (!payload || !payload.isAdmin) {
      set.status = 403
      return {
        error: 'Forbidden',
        message: 'Admin privileges required',
      }
    }

    // Parse query parameters
    const params = query as any
    const page = parseInt(params.page) || 1
    const pageSize = Math.min(parseInt(params.pageSize) || 20, 100)
    const status = params.status || 'all'

    // Build where clause
    const where: any = {}
    if (status === 'online') {
      where.node_online = 1
    } else if (status === 'offline') {
      where.node_online = 0
    }

    // Get total count
    const total = await prisma.ss_node.count({ where })

    // Get nodes with pagination
    const nodes = await prisma.ss_node.findMany({
      where,
      select: {
        id: true,
        name: true,
        server: true,
        method: true,
        type: true,
        node_class: true,
        node_group: true,
        traffic_rate: true,
        node_online: true,
        node_heartbeat: true,
        status: true,
        info: true,
        sort: true,
        node_bandwidth: true,
        node_bandwidth_limit: true,
        traffic_used: true,
        traffic_left: true,
        country_code: true,
      },
      orderBy: {
        sort: 'asc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    // Format nodes
    const formattedNodes = nodes.map((node: any) => ({
      id: node.id,
      name: node.name,
      server: node.server,
      method: node.method,
      type: node.type,
      node_class: node.node_class,
      node_group: node.node_group,
      traffic_rate: node.traffic_rate,
      online: node.node_online === 1,
      last_heartbeat: node.node_heartbeat ? new Date(parseInt(node.node_heartbeat.toString()) * 1000) : null,
      status: node.status,
      info: node.info,
      sort: node.sort,
      bandwidth: {
        total: node.node_bandwidth?.toString() || '0',
        limit: node.node_bandwidth_limit?.toString() || '0',
        used: node.traffic_used?.toString() || '0',
        left: node.traffic_left?.toString() || '0',
      },
      country_code: node.country_code || '',
    }))

    return {
      nodes: formattedNodes,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  } catch (error) {
    console.error('Admin nodes list error:', error)
    set.status = 500
    return {
      error: 'Internal Server Error',
      message: 'Failed to fetch nodes',
    }
  }
}, {
  detail: {
    tags: ['Admin'],
    description: 'Get list of all nodes (admin only)',
    security: [{ BearerAuth: [] }],
  },
})

/**
 * GET /api/admin/nodes/:id
 *
 * Get detailed node information by ID
 */
adminController.get('/nodes/:id', async ({ set, request, params }) => {
  try {
    // Verify admin
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

    if (!payload || !payload.isAdmin) {
      set.status = 403
      return {
        error: 'Forbidden',
        message: 'Admin privileges required',
      }
    }

    const nodeId = parseInt(params.id)

    if (isNaN(nodeId)) {
      set.status = 400
      return {
        error: 'Bad Request',
        message: 'Invalid node ID',
      }
    }

    // Get node
    const node = await prisma.ss_node.findUnique({
      where: { id: nodeId },
    })

    if (!node) {
      set.status = 404
      return {
        error: 'Not Found',
        message: 'Node not found',
      }
    }

    return {
      id: node.id,
      name: node.name,
      server: node.server,
      method: node.method,
      type: node.type,
      node_class: node.node_class,
      node_group: node.node_group,
      traffic_rate: node.traffic_rate,
      node_online: node.node_online === 1,
      node_heartbeat: node.node_heartbeat ? new Date(parseInt(node.node_heartbeat.toString()) * 1000) : null,
      status: node.status,
      info: node.info,
      sort: node.sort,
      node_speedlimit: node.node_speedlimit.toString(),
      node_connector: node.node_connector,
      node_bandwidth: node.node_bandwidth.toString(),
      node_bandwidth_limit: node.node_bandwidth_limit.toString(),
      node_cost: node.node_cost,
      country_code: node.country_code || '',
      node_unlock: node.node_unlock || '',
      custom_method: node.custom_method,
      custom_rss: node.custom_rss,
    }
  } catch (error) {
    console.error('Admin node detail error:', error)
    set.status = 500
    return {
      error: 'Internal Server Error',
      message: 'Failed to fetch node details',
    }
  }
}, {
  detail: {
    tags: ['Admin'],
    description: 'Get detailed node information (admin only)',
    security: [{ BearerAuth: [] }],
  },
})

/**
 * POST /api/admin/nodes
 *
 * Create a new node
 */
adminController.post('/nodes', async ({ set, request, body }) => {
  try {
    // Verify admin
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

    if (!payload || !payload.isAdmin) {
      set.status = 403
      return {
        error: 'Forbidden',
        message: 'Admin privileges required',
      }
    }

    // Parse request body
    const data = body as any

    // Validate required fields
    if (!data.name || !data.server) {
      set.status = 400
      return {
        error: 'Bad Request',
        message: 'Missing required fields: name, server',
      }
    }

    // Create node
    const node = await prisma.ss_node.create({
      data: {
        name: data.name,
        server: data.server,
        method: data.method || 'aes-256-gcm',
        type: data.type || 1,
        info: data.info || '',
        status: data.status || 'active',
        sort: data.sort || 0,
        traffic_rate: data.traffic_rate || 1.0,
        node_class: data.node_class || 0,
        node_group: data.node_group || 0,
        node_speedlimit: data.node_speedlimit || 0,
        node_connector: data.node_connector || 0,
        node_bandwidth: BigInt(data.node_bandwidth || 0),
        node_bandwidth_limit: BigInt(data.node_bandwidth_limit || 0),
        node_cost: data.node_cost || 5,
        country_code: data.country_code || '',
        node_unlock: data.node_unlock || '',
        custom_method: data.custom_method || false,
        custom_rss: data.custom_rss || 0,
        node_online: 1,
        node_heartbeat: BigInt(Math.floor(Date.now() / 1000)),
      },
    })

    return {
      message: 'Node created successfully',
      node: {
        id: node.id,
        name: node.name,
        server: node.server,
      },
    }
  } catch (error) {
    console.error('Admin node create error:', error)
    set.status = 500
    return {
      error: 'Internal Server Error',
      message: 'Failed to create node',
    }
  }
}, {
  body: t.Object({
    name: t.String(),
    server: t.String(),
    method: t.Optional(t.String()),
    type: t.Optional(t.Number()),
    info: t.Optional(t.String()),
    status: t.Optional(t.String()),
    sort: t.Optional(t.Number()),
    traffic_rate: t.Optional(t.Number()),
    node_class: t.Optional(t.Number()),
    node_group: t.Optional(t.Number()),
    node_speedlimit: t.Optional(t.Number()),
    node_connector: t.Optional(t.Number()),
    node_bandwidth: t.Optional(t.String()),
    node_bandwidth_limit: t.Optional(t.String()),
    node_cost: t.Optional(t.Number()),
    country_code: t.Optional(t.String()),
    node_unlock: t.Optional(t.String()),
    custom_method: t.Optional(t.Boolean()),
    custom_rss: t.Optional(t.Number()),
  }),
  detail: {
    tags: ['Admin'],
    description: 'Create a new node (admin only)',
    security: [{ BearerAuth: [] }],
  },
})

/**
 * PUT /api/admin/nodes/:id
 *
 * Update node information
 */
adminController.put('/nodes/:id', async ({ set, request, params, body }) => {
  try {
    // Verify admin
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

    if (!payload || !payload.isAdmin) {
      set.status = 403
      return {
        error: 'Forbidden',
        message: 'Admin privileges required',
      }
    }

    const nodeId = parseInt(params.id)

    if (isNaN(nodeId)) {
      set.status = 400
      return {
        error: 'Bad Request',
        message: 'Invalid node ID',
      }
    }

    // Check if node exists
    const existingNode = await prisma.ss_node.findUnique({
      where: { id: nodeId },
    })

    if (!existingNode) {
      set.status = 404
      return {
        error: 'Not Found',
        message: 'Node not found',
      }
    }

    // Parse request body
    const updateData = body as any

    // Filter allowed fields
    const allowedFields = [
      'name', 'server', 'method', 'type', 'info', 'status', 'sort',
      'traffic_rate', 'node_class', 'node_group', 'node_speedlimit',
      'node_connector', 'node_bandwidth', 'node_bandwidth_limit',
      'node_cost', 'country_code', 'node_unlock',
      'custom_method', 'custom_rss', 'node_online',
    ]

    // Build update data object
    const dataToUpdate: any = {}

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        if (field === 'node_bandwidth' || field === 'node_bandwidth_limit') {
          dataToUpdate[field] = BigInt(updateData[field])
        } else if (field === 'node_online') {
          dataToUpdate[field] = updateData[field] ? 1 : 0
        } else {
          dataToUpdate[field] = updateData[field]
        }
      }
    }

    // Update node
    const updatedNode = await prisma.ss_node.update({
      where: { id: nodeId },
      data: dataToUpdate,
    })

    return {
      message: 'Node updated successfully',
      node: {
        id: updatedNode.id,
        name: updatedNode.name,
        server: updatedNode.server,
        status: updatedNode.status,
      },
    }
  } catch (error) {
    console.error('Admin node update error:', error)
    set.status = 500
    return {
      error: 'Internal Server Error',
      message: 'Failed to update node',
    }
  }
}, {
  body: t.Object({
    name: t.Optional(t.String()),
    server: t.Optional(t.String()),
    method: t.Optional(t.String()),
    type: t.Optional(t.Number()),
    info: t.Optional(t.String()),
    status: t.Optional(t.String()),
    sort: t.Optional(t.Number()),
    traffic_rate: t.Optional(t.Number()),
    node_class: t.Optional(t.Number()),
    node_group: t.Optional(t.Number()),
    node_speedlimit: t.Optional(t.Number()),
    node_connector: t.Optional(t.Number()),
    node_bandwidth: t.Optional(t.String()),
    node_bandwidth_limit: t.Optional(t.String()),
    node_cost: t.Optional(t.Number()),
    country_code: t.Optional(t.String()),
    node_unlock: t.Optional(t.String()),
    custom_method: t.Optional(t.Boolean()),
    custom_rss: t.Optional(t.Number()),
    node_online: t.Optional(t.Boolean()),
  }),
  detail: {
    tags: ['Admin'],
    description: 'Update node information (admin only)',
    security: [{ BearerAuth: [] }],
  },
})

/**
 * DELETE /api/admin/nodes/:id
 *
 * Delete a node
 */
adminController.delete('/nodes/:id', async ({ set, request, params }) => {
  try {
    // Verify admin
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

    if (!payload || !payload.isAdmin) {
      set.status = 403
      return {
        error: 'Forbidden',
        message: 'Admin privileges required',
      }
    }

    const nodeId = parseInt(params.id)

    if (isNaN(nodeId)) {
      set.status = 400
      return {
        error: 'Bad Request',
        message: 'Invalid node ID',
      }
    }

    // Check if node exists
    const existingNode = await prisma.ss_node.findUnique({
      where: { id: nodeId },
    })

    if (!existingNode) {
      set.status = 404
      return {
        error: 'Not Found',
        message: 'Node not found',
      }
    }

    // Delete node
    await prisma.ss_node.delete({
      where: { id: nodeId },
    })

    return {
      message: 'Node deleted successfully',
    }
  } catch (error) {
    console.error('Admin node delete error:', error)
    set.status = 500
    return {
      error: 'Internal Server Error',
      message: 'Failed to delete node',
    }
  }
}, {
  detail: {
    tags: ['Admin'],
    description: 'Delete a node (admin only)',
    security: [{ BearerAuth: [] }],
  },
})

// ============================================================================
// NODE HEARTBEAT API (No Admin Auth Required)
// ============================================================================

/**
 * POST /api/node/heartbeat
 *
 * Receive heartbeat from remote node backend
 *
 * Authentication: Uses NODE_HEARTBEAT_TOKEN (not JWT)
 *
 * Expected body:
 * - node_id: Node ID
 * - online_users: Number of online users
 * - load: System load (string)
 * - uptime: Node uptime (float)
 */
export const nodeHeartbeatController = new Elysia({ prefix: '/node' })

nodeHeartbeatController.post('/heartbeat', async ({ set, body }) => {
  try {
    const data = body as any

    // Verify heartbeat token
    const authHeader = body.token || data.token
    if (!authHeader || authHeader !== NODE_HEARTBEAT_TOKEN) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'Invalid heartbeat token',
      }
    }

    const nodeId = parseInt(data.node_id)
    if (isNaN(nodeId)) {
      set.status = 400
      return {
        error: 'Bad Request',
        message: 'Invalid node ID',
      }
    }

    // Check if node exists
    const node = await prisma.ss_node.findUnique({
      where: { id: nodeId },
    })

    if (!node) {
      set.status = 404
      return {
        error: 'Not Found',
        message: 'Node not found',
      }
    }

    const now = BigInt(Math.floor(Date.now() / 1000))

    // Update node heartbeat and online status
    await prisma.ss_node.update({
      where: { id: nodeId },
      data: {
        node_heartbeat: now,
        node_online: 1,
      },
    })

    // Create/update node info log
    if (data.load || data.uptime !== undefined) {
      // Get or create node info record
      const existingInfo = await prisma.ss_node_info.findFirst({
        where: { node_id: nodeId },
      })

      if (existingInfo) {
        await prisma.ss_node_info.updateMany({
          where: { node_id: nodeId },
          data: {
            load: data.load || existingInfo.load,
            uptime: data.uptime !== undefined ? data.uptime : existingInfo.uptime,
            log_time: Math.floor(Date.now() / 1000),
          },
        })
      } else {
        await prisma.ss_node_info.create({
          data: {
            node_id: nodeId,
            load: data.load || '0.00',
            uptime: data.uptime !== undefined ? data.uptime : 0.0,
            log_time: Math.floor(Date.now() / 1000),
          },
        })
      }
    }

    // Log online users if provided
    if (data.online_users !== undefined) {
      const onlineUserCount = parseInt(data.online_users) || 0

      await prisma.ss_node_online_log.create({
        data: {
          node_id: nodeId,
          online_user: onlineUserCount,
          log_time: Math.floor(Date.now() / 1000),
        },
      })

      // Update online user count
      await prisma.ss_node.update({
        where: { id: nodeId },
        data: {
          node_connector: onlineUserCount,
        },
      })
    }

    return {
      message: 'Heartbeat received',
      node_id: nodeId,
      timestamp: now.toString(),
    }
  } catch (error) {
    console.error('Node heartbeat error:', error)
    set.status = 500
    return {
      error: 'Internal Server Error',
      message: 'Failed to process heartbeat',
    }
  }
}, {
  body: t.Object({
    token: t.String(),
    node_id: t.Number(),
    online_users: t.Optional(t.Number()),
    load: t.Optional(t.String()),
    uptime: t.Optional(t.Number()),
  }),
  detail: {
    tags: ['Node'],
    description: 'Receive heartbeat from remote node backend',
  },
})
