import { ref, computed } from 'vue'
import { authApi } from '@/shared/api/auth'
import type { LoginRequest, RegisterRequest, AuthResponse } from '@/shared/api/auth'

// User state
const user = ref<AuthResponse['user'] | null>(null)
const token = ref<string | null>(localStorage.getItem('token'))
const isAuthenticated = computed(() => !!token.value && !!user.value)

// Load user from localStorage on init
const initAuth = () => {
  const savedToken = localStorage.getItem('token')
  const savedUser = localStorage.getItem('user')

  if (savedToken) {
    token.value = savedToken
  }

  if (savedUser) {
    try {
      user.value = JSON.parse(savedUser)
    } catch (e) {
      console.error('Failed to parse user data:', e)
    }
  }
}

export function useAuth() {
  // Login
  const login = async (credentials: LoginRequest) => {
    try {
      const response = await authApi.login(credentials)

      // Save to state and localStorage
      token.value = response.token
      user.value = response.user
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))

      return response
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  // Register
  const register = async (data: RegisterRequest) => {
    try {
      const response = await authApi.register(data)

      // Auto login after registration
      token.value = response.token
      user.value = response.user
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))

      return response
    } catch (error) {
      console.error('Registration failed:', error)
      throw error
    }
  }

  // Logout
  const logout = async () => {
    try {
      await authApi.logout()
    } catch (error) {
      console.error('Logout API call failed:', error)
    } finally {
      // Clear state and localStorage
      token.value = null
      user.value = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
  }

  // Check if user needs to login
  const checkAuth = () => {
    if (!isAuthenticated.value) {
      // Redirect to login
      window.location.href = '/login.html'
      return false
    }
    return true
  }

  return {
    user: computed(() => user.value),
    token: computed(() => token.value),
    isAuthenticated,
    login,
    register,
    logout,
    checkAuth,
    initAuth,
  }
}
