/**
 * Authentication Middleware - JWT Verification
 * 
 * Extracts and verifies JWT token from Authorization header
 * Injects userId and user info into request context
 */

import { Elysia } from 'elysia'

export const authMiddleware = new Elysia({ name: 'auth-middleware' })
  .derive(async ({ jwt, request, set }) => {
    // Extract Authorization header
    const authHeader = request.headers.get('Authorization')
    
    // Check if header exists and has Bearer token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      }
    }

    // Extract token (remove "Bearer " prefix)
    const token = authHeader.substring(7)
    
    // Verify token
    const payload = await jwt.verify(token)
    
    if (!payload) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      }
    }

    // Inject user info into context
    return {
      userId: (payload as any).userId as number,
      userEmail: (payload as any).email as string,
      userName: (payload as any).user_name as string,
      isAdmin: (payload as any).isAdmin as boolean,
    }
  })
