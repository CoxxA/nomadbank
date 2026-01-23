/**
 * API 客户端
 * 用于与 Go 后端通信
 */
import type {
  BatchDeleteRequest,
  BatchPostponeRequest,
  CalendarDay,
  ChangePasswordRequest,
  CompleteTaskRequest,
  CreateChannelRequest,
  CreateStrategyRequest,
  CreateUserRequest,
  CreateWebhookRequest,
  DashboardStats,
  GenerateTasksRequest,
  ImportResult,
  LastTaskInfo,
  NextDayTasks,
  NotificationChannel,
  PagedResult,
  RecentActivity,
  ResetPasswordRequest,
  Strategy,
  SystemStatus,
  Task,
  TaskListParams,
  TodayTasksResponse,
  UpdateChannelRequest,
  UpdateProfileRequest,
  UpdateStrategyRequest,
  UpdateUserRequest,
  UpdateWebhookRequest,
  User,
  Webhook,
  WebhookLog,
} from './types'
import { getDateKey, parseDateKey } from './utils'

// 重新导出所有类型
export * from './types'

// ============================================
// 配置常量
// ============================================

// 生产模式使用同源，开发模式使用环境变量或代理
const API_BASE_URL = import.meta.env.VITE_API_URL || ''
const DEFAULT_TIMEOUT = 30000
const MAX_PAGE_SIZE = 100
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

// ============================================
// 业务 API 接口（适配 Go 后端 /api/v1）
// ============================================

/** 任务 API */
export const tasksApi = {
  list: (params?: TaskListParams) =>
    api.get<PagedResult<Task>>('/api/v1/tasks', toParams(params)),
  listAll: async (params?: TaskListParams): Promise<Task[]> => {
    let page = 1
    const items: Task[] = []
    while (true) {
      const pageData = await api.get<PagedResult<Task>>(
        '/api/v1/tasks',
        toParams({
          ...params,
          page,
          page_size: MAX_PAGE_SIZE,
        })
      )
      items.push(...pageData.items)
      if (items.length >= pageData.total || pageData.items.length < MAX_PAGE_SIZE) {
        break
      }
      page += 1
    }
    return items
  },
  generate: (data: GenerateTasksRequest) =>
    api.post<{ message: string; count: number }>(
      '/api/v1/tasks/generate',
      data
    ),
  complete: (id: string, _data?: CompleteTaskRequest) =>
    api.put<Task>(`/api/v1/tasks/${id}/complete`),
  skip: (id: string) => api.put<Task>(`/api/v1/tasks/${id}/complete`),
  delete: (id: string) => api.delete(`/api/v1/tasks/${id}`),
  deleteAll: () => api.delete('/api/v1/tasks'),
  batchDelete: async (data: BatchDeleteRequest) => {
    if (data.delete_all) {
      await api.delete('/api/v1/tasks')
    } else if (data.task_ids) {
      for (const id of data.task_ids) {
        await api.delete(`/api/v1/tasks/${id}`)
      }
    }
    return { message: '删除成功', deleted_count: data.task_ids?.length || 0 }
  },
  batchCompleteToday: async () => {
    const tasks = await tasksApi.listAll()
    const today = new Date().toISOString().split('T')[0]
    let count = 0
    for (const task of tasks) {
      if (getDateKey(task.exec_date) === today && task.status === 'pending') {
        await api.put(`/api/v1/tasks/${task.id}/complete`)
        count++
      }
    }
    return { message: '完成成功', completed_count: count }
  },
  batchPostpone: async (_data: BatchPostponeRequest) => {
    // Go 后端暂不支持，返回空结果
    return { message: '暂不支持', postponed_count: 0 }
  },
  getCycles: () => api.get<{ cycles: number[] }>('/api/v1/tasks/cycles'),
  getLastInfo: async (
    _strategyId?: string,
    _group?: string
  ): Promise<LastTaskInfo> => {
    const tasks = await tasksApi.listAll()
    if (tasks.length === 0) {
      return {
        has_tasks: false,
        last_exec_date: null,
        last_cycle: 0,
        suggested_start_date: new Date().toISOString().split('T')[0],
        suggested_cycle: 1,
        interval_days: 7,
      }
    }
    const sorted = tasks.sort(
      (a, b) =>
        parseDateKey(b.exec_date).getTime() -
        parseDateKey(a.exec_date).getTime()
    )
    const last = sorted[0]
    return {
      has_tasks: true,
      last_exec_date: last.exec_date,
      last_cycle: last.cycle,
      suggested_start_date: last.exec_date,
      suggested_cycle: last.cycle + 1,
      interval_days: 7,
    }
  },
}

/** 策略 API */
export const strategiesApi = {
  list: () => api.get<Strategy[]>('/api/v1/strategies'),
  get: (id: string) => api.get<Strategy>(`/api/v1/strategies/${id}`),
  create: (data: CreateStrategyRequest) =>
    api.post<Strategy>('/api/v1/strategies', data),
  update: (id: string, data: UpdateStrategyRequest) =>
    api.put<Strategy>(`/api/v1/strategies/${id}`, data),
  delete: (id: string) => api.delete(`/api/v1/strategies/${id}`),
}

/** 通知 API */
export const notificationsApi = {
  listChannels: () => api.get<NotificationChannel[]>('/api/v1/notifications'),
  list: () => api.get<NotificationChannel[]>('/api/v1/notifications'),
  createChannel: (data: CreateChannelRequest) =>
    api.post<NotificationChannel>('/api/v1/notifications', data),
  create: (data: CreateChannelRequest) =>
    api.post<NotificationChannel>('/api/v1/notifications', data),
  updateChannel: (id: string, data: UpdateChannelRequest) =>
    api.put<NotificationChannel>(`/api/v1/notifications/${id}`, data),
  update: (id: string, data: UpdateChannelRequest) =>
    api.put<NotificationChannel>(`/api/v1/notifications/${id}`, data),
  deleteChannel: (id: string) => api.delete(`/api/v1/notifications/${id}`),
  delete: (id: string) => api.delete(`/api/v1/notifications/${id}`),
  test: (channelId: string, message?: string) =>
    api.post(`/api/v1/notifications/${channelId}/test`, { message }),
  sendDailyReminder: async () => {
    return { message: '提醒功能暂不支持', tasks_count: 0, notified: false }
  },
  getTodayTasks: async (): Promise<TodayTasksResponse> => {
    const tasks = await tasksApi.listAll()
    const today = new Date().toISOString().split('T')[0]
    const todayTasks = tasks.filter((t) => getDateKey(t.exec_date) === today)
    return {
      date: today,
      tasks: todayTasks.map((t) => ({
        id: t.id,
        exec_time: t.exec_time,
        from_bank_name: t.from_bank?.name || '',
        to_bank_name: t.to_bank?.name || '',
        amount: t.amount,
        status: t.status,
      })),
      pending_count: todayTasks.filter((t) => t.status === 'pending').length,
      completed_count: todayTasks.filter((t) => t.status === 'completed').length,
    }
  },
}

/** 统计 API */
export const statsApi = {
  dashboard: () => api.get<DashboardStats>('/api/v1/stats/dashboard'),
  recent: async (limit?: number): Promise<RecentActivity[]> => {
    const tasks = await tasksApi.listAll()
    const getExecMinutes = (execTime?: string) => {
      if (!execTime) return 0
      const [hour, minute] = execTime.split(':').map(Number)
      if (Number.isNaN(hour) || Number.isNaN(minute)) return 0
      return hour * 60 + minute
    }
    const getSortValue = (task: Task) => {
      const dateKey = getDateKey(task.completed_at || task.exec_date)
      const baseTime = parseDateKey(dateKey).getTime()
      return baseTime + getExecMinutes(task.exec_time) * 60 * 1000
    }
    const completed = tasks
      .filter((t) => t.status === 'completed')
      .sort(
        (a, b) =>
          getSortValue(b) - getSortValue(a)
      )
      .slice(0, limit || 5)
    return completed.map((t) => ({
      id: t.id,
      exec_date: getDateKey(t.completed_at || t.exec_date),
      from_bank: t.from_bank?.name || '',
      to_bank: t.to_bank?.name || '',
      amount: t.amount,
      status: t.status,
    }))
  },
  nextDayTasks: async (): Promise<NextDayTasks | null> => {
    const tasks = await tasksApi.listAll()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const pending = tasks
      .filter((t) => t.status === 'pending' && parseDateKey(t.exec_date) > today)
      .sort(
        (a, b) =>
          parseDateKey(a.exec_date).getTime() - parseDateKey(b.exec_date).getTime()
      )
    if (pending.length === 0) return null
    const nextDate = getDateKey(pending[0].exec_date)
    const nextTasks = pending.filter((t) => getDateKey(t.exec_date) === nextDate)
    const daysUntil = Math.ceil(
      (parseDateKey(nextDate).getTime() - today.getTime()) /
        (1000 * 60 * 60 * 24)
    )
    return {
      date: nextDate,
      days_until: daysUntil,
      tasks: nextTasks.map((t) => ({
        id: t.id,
        from_bank_name: t.from_bank?.name || '',
        to_bank_name: t.to_bank?.name || '',
        amount: t.amount,
      })),
    }
  },
  calendar: async (
    startDate: string,
    endDate: string
  ): Promise<CalendarDay[]> => {
    const tasks = await tasksApi.listAll()
    const result: CalendarDay[] = []
    const start = new Date(startDate)
    const end = new Date(endDate)
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      const dayTasks = tasks.filter((t) => getDateKey(t.exec_date) === dateStr)
      result.push({
        date: dateStr,
        task_count: dayTasks.length,
        has_pending: dayTasks.some((t) => t.status === 'pending'),
      })
    }
    return result
  },
}


/** 导入导出 API */
export const importExportApi = {
  importBanks: async (_file: File): Promise<ImportResult> => {
    // Go 后端暂不支持
    return { success_count: 0, error_count: 0, errors: ['导入功能暂不支持'] }
  },
}

/** Webhook API */
export const webhooksApi = {
  list: async (): Promise<Webhook[]> => {
    // Go 后端暂不支持 Webhook
    return []
  },
  create: async (_data: CreateWebhookRequest): Promise<Webhook> => {
    throw new ApiError('Webhook 功能暂不支持', 501)
  },
  update: async (
    _id: string,
    _data: UpdateWebhookRequest
  ): Promise<Webhook> => {
    throw new ApiError('Webhook 功能暂不支持', 501)
  },
  delete: async (_id: string) => {
    throw new ApiError('Webhook 功能暂不支持', 501)
  },
  getLogs: async (
    _webhookId: string,
    _limit?: number
  ): Promise<WebhookLog[]> => {
    return []
  },
  test: async (_webhookId: string) => {
    return { message: 'Webhook 功能暂不支持' }
  },
  getEvents: async () => {
    return { events: ['task.completed', 'task.created'] }
  },
}

/** 系统 API */
export const systemApi = {
  /** 检查系统是否已初始化 */
  initialized: () => api.get<SystemStatus>('/api/v1/system/initialized'),
}

/** 用户管理 API（管理员） */
export const usersApi = {
  /** 获取用户列表 */
  list: () => api.get<User[]>('/api/v1/users'),
  /** 创建用户 */
  create: (data: CreateUserRequest) => api.post<User>('/api/v1/users', data),
  /** 更新用户 */
  update: (id: string, data: UpdateUserRequest) =>
    api.put<User>(`/api/v1/users/${id}`, data),
  /** 删除用户 */
  delete: (id: string) => api.delete(`/api/v1/users/${id}`),
  /** 重置用户密码 */
  resetPassword: (id: string, data: ResetPasswordRequest) =>
    api.put(`/api/v1/users/${id}/password`, data),
}

/** 个人设置 API */
export const profileApi = {
  /** 修改密码 */
  changePassword: (data: ChangePasswordRequest) =>
    api.put('/api/v1/auth/password', data),
  /** 更新个人资料 */
  updateProfile: (data: UpdateProfileRequest) =>
    api.put<User>('/api/v1/auth/profile', data),
}
