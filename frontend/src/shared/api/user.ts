import { request } from './client'

// User types
export interface UserInfo {
  id: number
  email: string
  username: string
  u: number
  d: number
  transferEnable: number
  expireTime: number
  planId: number
  balance: number
  createdAt: string
  updatedAt: string
}

export interface NodeInfo {
  id: number
  name: string
  server: string
  type: number
  status: boolean
  isOnline: boolean
  onlineUserCount: number
  load: string
  rate: string
}

export interface TrafficStats {
  total: number
  upload: number
  download: number
  remaining: number
  usagePercent: number
}

// User API
export const userApi = {
  // Get user info
  getInfo: () =>
    request.get<UserInfo>('/user/info'),

  // Get user nodes
  getNodes: () =>
    request.get<NodeInfo[]>('/user/nodes'),

  // Get subscription
  getSubscribe: () =>
    request.get('/user/subscribe'),

  // Get traffic stats
  getTraffic: () =>
    request.get<TrafficStats>('/user/traffic'),

  // Update profile
  updateProfile: (data: Partial<UserInfo>) =>
    request.put('/user/profile', data),
}
