import { queryOptions } from '@tanstack/react-query'
import { jsonBody, request } from '@/api/client'
import type {
  GenerateBatchInput,
  GenerateResult,
  Task,
  TaskBatch,
  TaskPage,
  TaskStatus,
} from '@/api/types'

export const taskKeys = {
  all: ['tasks'] as const,
  batches: ['task-batches'] as const,
}

export const taskBatchesQuery = queryOptions({
  queryKey: taskKeys.batches,
  queryFn: () => request<TaskBatch[]>('/api/v1/task-batches'),
})

export const tasksQuery = (status: TaskStatus | '', batchID: number, page: number) =>
  queryOptions({
    queryKey: [...taskKeys.all, status, batchID, page] as const,
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), page_size: '20' })
      if (status) params.set('status', status)
      if (batchID > 0) params.set('batch_id', String(batchID))
      return request<TaskPage>(`/api/v1/tasks?${params}`)
    },
  })

export const generateBatch = (input: GenerateBatchInput): Promise<GenerateResult> =>
  request('/api/v1/task-batches', { method: 'POST', body: jsonBody(input) })

export const deleteBatch = (id: number): Promise<void> =>
  request(`/api/v1/task-batches/${id}`, { method: 'DELETE' })

export const completeTask = (id: number): Promise<Task> =>
  request(`/api/v1/tasks/${id}/complete`, { method: 'POST' })
