import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/hooks/use-queries'
import type { TodayTasksResponse } from '@/lib/types'
import { notificationsApi } from './api'
import type { NotificationChannel } from './types'

/** 获取通知渠道列表 */
export function useNotificationChannels() {
  return useQuery<NotificationChannel[]>({
    queryKey: queryKeys.notificationChannels,
    queryFn: () => notificationsApi.listChannels(),
  })
}

/** 获取今日任务（通知） */
export function useTodayTasks() {
  return useQuery<TodayTasksResponse>({
    queryKey: queryKeys.todayTasks,
    queryFn: () => notificationsApi.getTodayTasks(),
  })
}
