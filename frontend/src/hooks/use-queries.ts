/**
 * TanStack Query Hooks
 * 适配 Go 后端 API
 */
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  banksApi,
  notificationsApi,
  statsApi,
  strategiesApi,
  tagsApi,
  tasksApi,
  webhooksApi,
} from '@/lib/api'
import type {
  Bank,
  BankWithNextTask,
  CalendarDay,
  DashboardStats,
  NextDayTasks,
  NotificationChannel,
  RecentActivity,
  Strategy,
  Tag,
  Task,
  TodayTasksResponse,
  Webhook,
} from '@/lib/types'

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
  banks: ['banks'] as const,
  banksWithTasks: ['banksWithTasks'] as const,
  bankGroups: ['bankGroups'] as const,
  // 任务
  tasks: (status?: string, cycle?: number) => ['tasks', status, cycle] as const,
  taskCycles: ['taskCycles'] as const,
  // 其他
  strategies: ['strategies'] as const,
  notificationChannels: ['notificationChannels'] as const,
  tags: ['tags'] as const,
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

/** 获取今日任务 */
export function useTodayTasks() {
  return useQuery<TodayTasksResponse>({
    queryKey: queryKeys.todayTasks,
    queryFn: () => notificationsApi.getTodayTasks(),
  })
}

// ============================================
// 银行相关 Hooks
// ============================================

/** 获取银行列表 */
export function useBanks() {
  return useQuery<Bank[]>({
    queryKey: queryKeys.banks,
    queryFn: () => banksApi.list(),
  })
}

/** 获取银行列表（含下一个任务） */
export function useBanksWithNextTasks() {
  return useQuery<BankWithNextTask[]>({
    queryKey: queryKeys.banksWithTasks,
    queryFn: () => banksApi.listWithNextTasks(),
    // 任务变化会影响下次执行信息，每次访问页面都重新获取
    staleTime: 0,
  })
}

/** 获取银行分组列表 */
export function useBankGroups() {
  return useQuery<{ groups: string[] }>({
    queryKey: queryKeys.bankGroups,
    queryFn: () => banksApi.getGroups(),
  })
}

// ============================================
// 任务相关 Hooks
// ============================================

/** 获取任务列表 */
export function useTasks(status?: string, cycle?: number) {
  return useQuery<Task[]>({
    queryKey: queryKeys.tasks(status, cycle),
    queryFn: () => tasksApi.list(status, cycle),
  })
}

/** 获取任务周期列表 */
export function useTaskCycles() {
  return useQuery<{ cycles: number[] }>({
    queryKey: queryKeys.taskCycles,
    queryFn: () => tasksApi.getCycles(),
  })
}

// ============================================
// 策略相关 Hooks
// ============================================

/** 获取策略列表 */
export function useStrategies() {
  return useQuery<Strategy[]>({
    queryKey: queryKeys.strategies,
    queryFn: () => strategiesApi.list(),
  })
}

// ============================================
// 通知相关 Hooks
// ============================================

/** 获取通知渠道列表 */
export function useNotificationChannels() {
  return useQuery<NotificationChannel[]>({
    queryKey: queryKeys.notificationChannels,
    queryFn: () => notificationsApi.listChannels(),
  })
}

// ============================================
// 标签相关 Hooks
// ============================================

/** 获取标签列表 */
export function useTags() {
  return useQuery<Tag[]>({
    queryKey: queryKeys.tags,
    queryFn: () => tagsApi.list(),
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
      queryClient.invalidateQueries({ queryKey: queryKeys.banks })
      queryClient.invalidateQueries({ queryKey: queryKeys.banksWithTasks })
      queryClient.invalidateQueries({ queryKey: queryKeys.bankGroups })
    },

    /** 刷新任务数据（同时刷新统计和银行下次任务信息） */
    refreshTasks: () => {
      // 强制立即重新获取任务列表
      queryClient.refetchQueries({ queryKey: ['tasks'] })
      queryClient.refetchQueries({ queryKey: queryKeys.taskCycles })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
      queryClient.invalidateQueries({ queryKey: queryKeys.todayTasks })
      // 任务变化会影响银行的下次任务信息，强制立即重新获取
      queryClient.refetchQueries({ queryKey: queryKeys.banksWithTasks })
    },

    /** 刷新策略数据 */
    refreshStrategies: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.strategies })
    },

    /** 刷新标签数据 */
    refreshTags: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags })
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
