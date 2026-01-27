/**
 * API 客户端
 * 用于与 Go 后端通信
 */
import { tasksApi } from '@/domains/task/api'
import { ApiError, api } from './api-client'
import type {
  CalendarDay,
  ChangePasswordRequest,
  CreateUserRequest,
  CreateWebhookRequest,
  DashboardStats,
  ImportResult,
  NextDayTasks,
  RecentActivity,
  ResetPasswordRequest,
  SystemStatus,
  Task,
  UpdateProfileRequest,
  UpdateUserRequest,
  UpdateWebhookRequest,
  User,
  Webhook,
  WebhookLog,
} from './types'
import { getDateKey, parseDateKey } from './utils'

// 重新导出所有类型
export * from './types'
export { ApiError, api, toParams } from './api-client'

// ============================================
// 基础 API 方法
// ============================================

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
      .sort((a, b) => getSortValue(b) - getSortValue(a))
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
      .filter(
        (t) => t.status === 'pending' && parseDateKey(t.exec_date) > today
      )
      .sort(
        (a, b) =>
          parseDateKey(a.exec_date).getTime() -
          parseDateKey(b.exec_date).getTime()
      )
    if (pending.length === 0) return null
    const nextDate = getDateKey(pending[0].exec_date)
    const nextTasks = pending.filter(
      (t) => getDateKey(t.exec_date) === nextDate
    )
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
