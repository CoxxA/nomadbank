import { api } from '@/lib/api-client'
import { getDateKey } from '@/lib/utils'
import { tasksApi } from '@/domains/task/api'
import type {
  CreateChannelRequest,
  NotificationChannel,
  UpdateChannelRequest,
} from './types'
import type { TodayTasksResponse } from '@/lib/types'

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
