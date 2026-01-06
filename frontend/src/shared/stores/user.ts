import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { userApi } from '@/shared/api/user'
import type { UserInfo, NodeInfo, TrafficStats } from '@/shared/api/user'

export const useUserStore = defineStore('user', () => {
  // State
  const userInfo = ref<UserInfo | null>(null)
  const nodes = ref<NodeInfo[]>([])
  const traffic = ref<TrafficStats | null>(null)
  const loading = ref(false)

  // Computed
  const hasUserInfo = computed(() => !!userInfo.value)
  const hasNodes = computed(() => nodes.value.length > 0)

  // Actions
  const fetchUserInfo = async () => {
    loading.value = true
    try {
      userInfo.value = await userApi.getInfo()
    } catch (error) {
      console.error('Failed to fetch user info:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  const fetchNodes = async () => {
    loading.value = true
    try {
      nodes.value = await userApi.getNodes()
    } catch (error) {
      console.error('Failed to fetch nodes:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  const fetchTraffic = async () => {
    loading.value = true
    try {
      traffic.value = await userApi.getTraffic()
    } catch (error) {
      console.error('Failed to fetch traffic:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  const updateProfile = async (data: Partial<UserInfo>) => {
    loading.value = true
    try {
      await userApi.updateProfile(data)
      // Refresh user info
      await fetchUserInfo()
    } catch (error) {
      console.error('Failed to update profile:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // Initialize
  const init = async () => {
    await Promise.all([
      fetchUserInfo(),
      fetchNodes(),
      fetchTraffic(),
    ])
  }

  return {
    // State
    userInfo,
    nodes,
    traffic,
    loading,
    // Computed
    hasUserInfo,
    hasNodes,
    // Actions
    fetchUserInfo,
    fetchNodes,
    fetchTraffic,
    updateProfile,
    init,
  }
})
