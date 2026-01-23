/**
 * API 基础客户端
 * 提供 request/api/toParams 等通用能力
 */

// ============================================
// 配置常量
// ============================================

const API_BASE_URL = import.meta.env.VITE_API_URL || ''
const DEFAULT_TIMEOUT = 30000
const ACCESS_TOKEN_KEY = 'nomad-bank-access-token'

// ============================================
// 错误处理
// ============================================

/** API 错误类 */
export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// ============================================
// 认证
// ============================================

/**
 * 从 cookie 获取 token
 */
function getTokenFromCookie(): string | null {
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === ACCESS_TOKEN_KEY) {
      try {
        return JSON.parse(decodeURIComponent(value))
      } catch {
        return decodeURIComponent(value)
      }
    }
  }
  return null
}

/**
 * 获取认证头
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = getTokenFromCookie()
  if (token) {
    return { Authorization: `Bearer ${token}` }
  }
  return {}
}

// ============================================
// 请求封装
// ============================================

interface FetchOptions extends RequestInit {
  params?: Record<string, string>
  timeout?: number
}

export function toParams<T extends object>(
  params?: T
): Record<string, string> | undefined {
  if (!params) return undefined
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (value === undefined || value === null || value === '') continue
    result[key] = String(value)
  }
  return result
}

/**
 * 带超时的 fetch 包装
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number = DEFAULT_TIMEOUT
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('请求超时，请稍后重试', 408)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * 通用 API 请求函数
 */
async function request<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { params, timeout, ...fetchOptions } = options

  // 构建 URL
  let url = `${API_BASE_URL}${endpoint}`
  if (params) {
    url += `?${new URLSearchParams(params).toString()}`
  }

  // 发送请求
  const response = await fetchWithTimeout(
    url,
    {
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        ...(await getAuthHeaders()),
        ...fetchOptions.headers,
      },
    },
    timeout
  )

  // 处理错误响应
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new ApiError(errorData.message || '请求失败', response.status)
  }

  // 204 No Content
  if (response.status === 204) {
    return {} as T
  }

  return response.json()
}

// ============================================
// 基础 API 方法
// ============================================

export const api = {
  get: <T>(endpoint: string, params?: Record<string, string>) =>
    request<T>(endpoint, { method: 'GET', params }),

  post: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
}
