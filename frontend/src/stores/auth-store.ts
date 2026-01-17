import { create } from 'zustand'
import { getCookie, removeCookie, setCookie } from '@/lib/cookies'
import type { UserRole } from '@/lib/types'

const ACCESS_TOKEN_KEY = 'nomad-bank-access-token'
// 生产模式使用同源，开发模式使用环境变量
const API_BASE_URL = import.meta.env.VITE_API_URL || ''

interface User {
  id: string
  username: string
  role: UserRole
  nickname: string
  avatar: string
}

interface AuthState {
  auth: {
    user: User | null
    accessToken: string
    loading: boolean
    setUser: (user: User | null) => void
    setAccessToken: (accessToken: string) => void
    setLoading: (loading: boolean) => void
    signIn: (username: string, password: string) => Promise<void>
    signUp: (
      username: string,
      password: string,
      nickname?: string
    ) => Promise<void>
    signOut: () => void
    reset: () => void
    initializeAuth: () => Promise<void>
    isAdmin: () => boolean
  }
}

export const useAuthStore = create<AuthState>()((set, get) => {
  const cookieState = getCookie(ACCESS_TOKEN_KEY)
  const initToken = cookieState ? JSON.parse(cookieState) : ''

  return {
    auth: {
      user: null,
      accessToken: initToken,
      loading: true,

      setUser: (user) =>
        set((state) => ({ ...state, auth: { ...state.auth, user } })),

      setAccessToken: (accessToken) =>
        set((state) => {
          setCookie(ACCESS_TOKEN_KEY, JSON.stringify(accessToken))
          return { ...state, auth: { ...state.auth, accessToken } }
        }),

      setLoading: (loading) =>
        set((state) => ({ ...state, auth: { ...state.auth, loading } })),

      signIn: async (username: string, password: string) => {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({}))
          throw new Error(error.message || '登录失败')
        }

        const data = await response.json()
        const { access_token, user } = data

        set((state) => ({
          ...state,
          auth: {
            ...state.auth,
            user: {
              id: user.id,
              username: user.username,
              role: user.role || 'user',
              nickname: user.nickname || user.username,
              avatar: user.avatar || '',
            },
            accessToken: access_token,
          },
        }))
        setCookie(ACCESS_TOKEN_KEY, JSON.stringify(access_token))
      },

      signUp: async (username: string, password: string, nickname?: string) => {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, nickname }),
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({}))
          throw new Error(error.message || '注册失败')
        }

        // Go 后端注册后自动登录，返回 token
        const data = await response.json()
        const { access_token, user } = data

        set((state) => ({
          ...state,
          auth: {
            ...state.auth,
            user: {
              id: user.id,
              username: user.username,
              role: user.role || 'user',
              nickname: user.nickname || user.username,
              avatar: user.avatar || '',
            },
            accessToken: access_token,
          },
        }))
        setCookie(ACCESS_TOKEN_KEY, JSON.stringify(access_token))
      },

      signOut: () => {
        get().auth.reset()
      },

      reset: () =>
        set((state) => {
          removeCookie(ACCESS_TOKEN_KEY)
          return {
            ...state,
            auth: {
              ...state.auth,
              user: null,
              accessToken: '',
            },
          }
        }),

      initializeAuth: async () => {
        try {
          const token = get().auth.accessToken
          if (!token) return

          const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          })

          if (response.ok) {
            const user = await response.json()
            set((state) => ({
              ...state,
              auth: {
                ...state.auth,
                user: {
                  id: user.id,
                  username: user.username,
                  role: user.role || 'user',
                  nickname: user.nickname || user.username,
                  avatar: user.avatar || '',
                },
              },
            }))
          } else {
            get().auth.reset()
          }
        } catch {
          get().auth.reset()
        } finally {
          get().auth.setLoading(false)
        }
      },

      isAdmin: () => {
        const user = get().auth.user
        return user?.role === 'admin'
      },
    },
  }
})
