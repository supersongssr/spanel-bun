import { request } from './client'

// Auth API types
export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  username: string
}

export interface AuthResponse {
  token: string
  user: {
    id: number
    email: string
    username: string
  }
}

// Auth API
export const authApi = {
  // Login
  login: (data: LoginRequest) =>
    request.post<AuthResponse>('/auth/login', data),

  // Register
  register: (data: RegisterRequest) =>
    request.post<AuthResponse>('/auth/register', data),

  // Logout
  logout: () =>
    request.post('/auth/logout'),

  // Reset password
  resetPassword: (email: string) =>
    request.post('/auth/reset-password', { email }),

  // Send verification email
  sendVerification: (email: string) =>
    request.post('/auth/send-verification', { email }),
}
