import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as cookies from '@/lib/cookies'
import { useAuthStore } from '../auth-store'

// Mock cookies 模块
vi.mock('@/lib/cookies', () => ({
  getCookie: vi.fn(),
  setCookie: vi.fn(),
  removeCookie: vi.fn(),
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('auth-store', () => {
  beforeEach(() => {
    // 重置所有 mock
    vi.clearAllMocks()
    // 重置 store 状态
    useAuthStore.setState({
      auth: {
        ...useAuthStore.getState().auth,
        user: null,
        accessToken: '',
        loading: true,
      },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('初始状态', () => {
    it('初始 user 为 null', () => {
      const { auth } = useAuthStore.getState()
      expect(auth.user).toBeNull()
    })

    it('初始 loading 为 true', () => {
      const { auth } = useAuthStore.getState()
      expect(auth.loading).toBe(true)
    })
  })

  describe('setUser', () => {
    it('设置用户信息', () => {
      const { auth } = useAuthStore.getState()
      const mockUser = {
        id: '123',
        username: 'testuser',
        role: 'user' as const,
        nickname: 'Test',
        avatar: '',
      }

      auth.setUser(mockUser)

      expect(useAuthStore.getState().auth.user).toEqual(mockUser)
    })

    it('清除用户信息', () => {
      const { auth } = useAuthStore.getState()
      auth.setUser({
        id: '123',
        username: 'test',
        role: 'user',
        nickname: 'Test',
        avatar: '',
      })
      auth.setUser(null)

      expect(useAuthStore.getState().auth.user).toBeNull()
    })
  })

  describe('setAccessToken', () => {
    it('设置 token 并保存到 cookie', () => {
      const { auth } = useAuthStore.getState()
      auth.setAccessToken('new-token')

      expect(useAuthStore.getState().auth.accessToken).toBe('new-token')
      expect(cookies.setCookie).toHaveBeenCalledWith(
        'nomad-bank-access-token',
        JSON.stringify('new-token')
      )
    })
  })

  describe('setLoading', () => {
    it('设置 loading 状态', () => {
      const { auth } = useAuthStore.getState()
      auth.setLoading(false)

      expect(useAuthStore.getState().auth.loading).toBe(false)
    })
  })

  describe('signIn', () => {
    it('登录成功设置用户和 token', async () => {
      const mockResponse = {
        access_token: 'jwt-token',
        user: {
          id: '1',
          username: 'admin',
          role: 'admin',
          nickname: 'Admin',
          avatar: '',
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const { auth } = useAuthStore.getState()
      await auth.signIn('admin', 'password')

      const state = useAuthStore.getState()
      expect(state.auth.user?.username).toBe('admin')
      expect(state.auth.accessToken).toBe('jwt-token')
      expect(cookies.setCookie).toHaveBeenCalled()
    })

    it('登录失败抛出错误', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: '用户名或密码错误' }),
      })

      const { auth } = useAuthStore.getState()
      await expect(auth.signIn('wrong', 'wrong')).rejects.toThrow(
        '用户名或密码错误'
      )
    })
  })

  describe('signOut / reset', () => {
    it('登出清除用户和 token', () => {
      const { auth } = useAuthStore.getState()

      // 先设置一些状态
      auth.setUser({
        id: '1',
        username: 'test',
        role: 'user',
        nickname: 'Test',
        avatar: '',
      })
      auth.setAccessToken('some-token')

      // 登出
      auth.signOut()

      const state = useAuthStore.getState()
      expect(state.auth.user).toBeNull()
      expect(state.auth.accessToken).toBe('')
      expect(cookies.removeCookie).toHaveBeenCalledWith(
        'nomad-bank-access-token'
      )
    })
  })

  describe('isAdmin', () => {
    it('管理员用户返回 true', () => {
      const { auth } = useAuthStore.getState()
      auth.setUser({
        id: '1',
        username: 'admin',
        role: 'admin',
        nickname: 'Admin',
        avatar: '',
      })

      expect(auth.isAdmin()).toBe(true)
    })

    it('普通用户返回 false', () => {
      const { auth } = useAuthStore.getState()
      auth.setUser({
        id: '2',
        username: 'user',
        role: 'user',
        nickname: 'User',
        avatar: '',
      })

      expect(auth.isAdmin()).toBe(false)
    })

    it('未登录返回 false', () => {
      const { auth } = useAuthStore.getState()
      expect(auth.isAdmin()).toBe(false)
    })
  })

  describe('initializeAuth', () => {
    it('有 token 时获取用户信息', async () => {
      // 先设置 token
      useAuthStore.setState({
        auth: {
          ...useAuthStore.getState().auth,
          accessToken: 'existing-token',
        },
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: '1',
            username: 'test',
            role: 'user',
            nickname: 'Test',
            avatar: '',
          }),
      })

      const { auth } = useAuthStore.getState()
      await auth.initializeAuth()

      const state = useAuthStore.getState()
      expect(state.auth.user?.username).toBe('test')
      expect(state.auth.loading).toBe(false)
    })

    it('token 无效时重置状态', async () => {
      useAuthStore.setState({
        auth: {
          ...useAuthStore.getState().auth,
          accessToken: 'invalid-token',
        },
      })

      mockFetch.mockResolvedValueOnce({
        ok: false,
      })

      const { auth } = useAuthStore.getState()
      await auth.initializeAuth()

      const state = useAuthStore.getState()
      expect(state.auth.user).toBeNull()
      expect(state.auth.accessToken).toBe('')
      expect(state.auth.loading).toBe(false)
    })

    it('无 token 时不请求 API', async () => {
      const { auth } = useAuthStore.getState()
      await auth.initializeAuth()

      expect(mockFetch).not.toHaveBeenCalled()
    })
  })
})
