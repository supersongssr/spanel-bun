/**
 * Node Controller - Node List and Status
 *
 * Provides endpoints for:
 * - Node list with filtering by user class/group
 * - Individual node details
 * - Online user count
 */

import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { verifyJWT } from '../lib/jwt'

export const nodeController = new Elysia()

/**
 * GET /api/user/nodes
 * 
 * Get list of nodes available to current user
 * 
 * Filtering logic:
 * - Nodes with type > 0 (user-visible)
 * - Nodes with node_online = 1 (online)
 * - User.class must meet node_class requirement
 * - User.node_group must match node_group (if > 0)
 * 
 * Returns:
 * - Array of nodes with server info, rate, online users
 */
nodeController.get('/nodes', async ({ set, request }) => {
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

    // Get user info for filtering
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        class: true,
        node_group: true,
      },
    })

    if (!user) {
      set.status = 404
      return {
        error: 'Not Found',
        message: 'User not found',
      }
    }

    // Query all user-visible nodes
    const nodes = await prisma.ss_node.findMany({
      where: {
        type: { gt: 0 },  // User-visible nodes
        node_online: 1,   // Online nodes only
      },
      select: {
        id: true,
        name: true,
        server: true,
        method: true,
        type: true,
        node_class: true,
        node_group: true,
        traffic_rate: true,
        status: true,
        info: true,
      },
    })

    // Filter by user class and node_group
    const filteredNodes = nodes.filter((node: any) => {
      // Check class requirement
      if (node.node_class > 0 && user.class < node.node_class) {
        return false
      }

      // Check group requirement (if node requires specific group)
      if (node.node_group > 0 && user.node_group !== node.node_group) {
        return false
      }

      return true
    })

    // Format nodes for response
    const formattedNodes = filteredNodes.map((node: any) => ({
      id: node.id,
      name: node.name,
      server: node.server,
      method: node.method,
      type: node.type,  // 1=SS, 2=SSR, 11=V2Ray, etc.
      traffic_rate: node.traffic_rate,
      status: node.status,
      info: node.info,
    }))

    return {
      nodes: formattedNodes,
      total: formattedNodes.length,
      user_class: user.class,
      user_node_group: user.node_group,
    }
  } catch (error) {
    console.error('Node list error:', error)
    set.status = 500
    return {
      error: 'Internal Server Error',
      message: 'Failed to fetch node list',
    }
  }
}, {
  detail: {
    tags: ['Node'],
    description: 'Get list of available nodes for current user',
    security: [{ BearerAuth: [] }],
  },
})

/**
 * GET /api/user/nodes/:id
 * 
 * Get detailed information about a specific node
 * 
 * Parameters:
 * - id: Node ID
 */
nodeController.get('/nodes/:id', async ({ set, request, params }) => {
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
    const nodeId = parseInt(params.id)

    if (isNaN(nodeId)) {
      set.status = 400
      return {
        error: 'Bad Request',
        message: 'Invalid node ID',
      }
    }

    // Get user info for access control
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        class: true,
        node_group: true,
      },
    })

    if (!user) {
      set.status = 404
      return {
        error: 'Not Found',
        message: 'User not found',
      }
    }

    // Query node
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

    // Check access permissions
    if (node.node_class > 0 && user.class < node.node_class) {
      set.status = 403
      return {
        error: 'Forbidden',
        message: 'Your account level is insufficient for this node',
      }
    }

    if (node.node_group > 0 && user.node_group !== node.node_group) {
      set.status = 403
      return {
        error: 'Forbidden',
        message: 'You do not have access to this node group',
      }
    }

    // Get online user count from log if available
    const onlineLog = await prisma.ss_node_online_log.findFirst({
      where: { node_id: nodeId },
      orderBy: { log_time: 'desc' },
    })

    return {
      id: node.id,
      name: node.name,
      server: node.server,
      port: node.server_port,
      method: node.method,
      protocol: node.protocol,
      obfs: node.obfs,
      type: node.type,
      node_class: node.node_class,
      node_group: node.node_group,
      traffic_rate: node.traffic_rate,
      online_user: node.online_user,
      status: node.status,
      info: node.info,
      online_log: onlineLog ? {
        online_user: onlineLog.online_user,
        log_time: onlineLog.log_time,
      } : null,
    }
  } catch (error) {
    console.error('Node detail error:', error)
    set.status = 500
    return {
      error: 'Internal Server Error',
      message: 'Failed to fetch node details',
    }
  }
}, {
  detail: {
    tags: ['Node'],
    description: 'Get detailed information about a specific node',
    security: [{ BearerAuth: [] }],
  },
})
