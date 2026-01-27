import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/hooks/use-queries'
import type { PagedResult } from '@/lib/types'
import { tasksApi } from './api'
import type { Task, TaskListParams } from './types'

/** 获取任务列表 */
export function useTasks(params?: TaskListParams) {
  return useQuery<PagedResult<Task>>({
    queryKey: queryKeys.tasks(params),
    queryFn: () => tasksApi.list(params),
  })
}

/** 获取全部任务（用于仪表盘统计） */
export function useAllTasks(params?: TaskListParams) {
  return useQuery<Task[]>({
    queryKey: queryKeys.allTasks(params),
    queryFn: () => tasksApi.listAll(params),
  })
}

/** 获取任务周期列表 */
export function useTaskCycles() {
  return useQuery<{ cycles: number[] }>({
    queryKey: queryKeys.taskCycles,
    queryFn: () => tasksApi.getCycles(),
  })
}
