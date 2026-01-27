import { api, toParams } from '@/lib/api-client'
import type { PagedResult } from '@/lib/types'
import { getDateKey, parseDateKey } from '@/lib/utils'
import type {
  BatchDeleteRequest,
  BatchPostponeRequest,
  CompleteTaskRequest,
  GenerateTasksRequest,
  LastTaskInfo,
  Task,
  TaskListParams,
} from './types'

const MAX_PAGE_SIZE = 100

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
      if (
        items.length >= pageData.total ||
        pageData.items.length < MAX_PAGE_SIZE
      ) {
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
