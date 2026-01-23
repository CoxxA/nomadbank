/**
 * TanStack Query Hooks
 * 适配 Go 后端 API
 */
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { statsApi, webhooksApi } from '@/lib/api'
import type {
  CalendarDay,
  DashboardStats,
  NextDayTasks,
  RecentActivity,
  Webhook,
} from '@/lib/types'
import type { BankListParams } from '@/domains/bank/types'
import type { TaskListParams } from '@/domains/task/types'

// ============================================
// Query Keys
// ============================================

export const queryKeys = {
  // 统计
  dashboard: ['dashboard'] as const,
  recent: (limit: number) => ['recent', limit] as const,
  nextDayTasks: ['nextDayTasks'] as const,
  calendar: (startDate: string, endDate: string) =>
    ['calendar', startDate, endDate] as const,
  todayTasks: ['todayTasks'] as const,
  // 银行
  banks: (params?: BankListParams) =>
    [
      'banks',
      params?.page ?? 1,
      params?.page_size ?? 20,
      params?.status ?? '',
      params?.group ?? '',
      params?.q ?? '',
    ] as const,
  banksWithTasks: (params?: BankListParams) =>
    [
      'banksWithTasks',
      params?.page ?? 1,
      params?.page_size ?? 20,
      params?.status ?? '',
      params?.group ?? '',
      params?.q ?? '',
    ] as const,
  bankGroups: ['bankGroups'] as const,
  // 任务
  tasks: (params?: TaskListParams) =>
    [
      'tasks',
      params?.page ?? 1,
      params?.page_size ?? 20,
      params?.status ?? '',
      params?.cycle ?? '',
      params?.group ?? '',
      params?.q ?? '',
    ] as const,
  allTasks: (params?: TaskListParams) =>
    [
      'tasksAll',
      params?.status ?? '',
      params?.cycle ?? '',
      params?.group ?? '',
      params?.q ?? '',
    ] as const,
  taskCycles: ['taskCycles'] as const,
  // 其他
  strategies: ['strategies'] as const,
  notificationChannels: ['notificationChannels'] as const,
  webhooks: ['webhooks'] as const,
}

// ============================================
// 统计相关 Hooks
// ============================================

/** 获取仪表盘统计数据 */
export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: queryKeys.dashboard,
    queryFn: () => statsApi.dashboard(),
  })
}

/** 获取最近活动记录 */
export function useRecentActivities(limit: number = 5) {
  return useQuery<RecentActivity[]>({
    queryKey: queryKeys.recent(limit),
    queryFn: () => statsApi.recent(limit),
  })
}

/** 获取下一天任务 */
export function useNextDayTasks() {
  return useQuery<NextDayTasks | null>({
    queryKey: queryKeys.nextDayTasks,
    queryFn: () => statsApi.nextDayTasks(),
  })
}

/** 获取日历数据 */
export function useCalendarData(startDate: string, endDate: string) {
  return useQuery<CalendarDay[]>({
    queryKey: queryKeys.calendar(startDate, endDate),
    queryFn: () => statsApi.calendar(startDate, endDate),
    enabled: !!startDate && !!endDate,
  })
}

// ============================================
// Webhook 相关 Hooks
// ============================================

/** 获取 Webhook 列表 */
export function useWebhooks() {
  return useQuery<Webhook[]>({
    queryKey: queryKeys.webhooks,
    queryFn: () => webhooksApi.list(),
  })
}

// ============================================
// 数据刷新 Hook
// ============================================

export function useRefreshQueries() {
  const queryClient = useQueryClient()

  return {
    /** 刷新所有统计数据 */
    refreshStats: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
      queryClient.invalidateQueries({ queryKey: ['recent'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.nextDayTasks })
      queryClient.invalidateQueries({ queryKey: queryKeys.todayTasks })
    },

    /** 刷新银行数据 */
    refreshBanks: () => {
      queryClient.invalidateQueries({ queryKey: ['banks'] })
      queryClient.invalidateQueries({ queryKey: ['banksWithTasks'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.bankGroups })
    },

    /** 刷新任务数据（同时刷新统计和银行下次任务信息） */
    refreshTasks: () => {
      // 强制立即重新获取任务列表
      queryClient.refetchQueries({ queryKey: ['tasks'] })
      queryClient.refetchQueries({ queryKey: ['tasksAll'] })
      queryClient.refetchQueries({ queryKey: queryKeys.taskCycles })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
      queryClient.invalidateQueries({ queryKey: ['recent'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.todayTasks })
      // 任务变化会影响银行的下次任务信息，强制立即重新获取
      queryClient.refetchQueries({ queryKey: ['banksWithTasks'] })
    },

    /** 刷新策略数据 */
    refreshStrategies: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.strategies })
    },

    /** 刷新通知渠道数据 */
    refreshNotificationChannels: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.notificationChannels,
      })
    },

    /** 刷新 Webhook 数据 */
    refreshWebhooks: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.webhooks })
    },

    /** 刷新所有数据 */
    refreshAll: () => {
      queryClient.invalidateQueries()
    },
  }
}
