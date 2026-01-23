import type { Bank } from '@/domains/bank/types'

export interface TaskListParams {
  page?: number
  page_size?: number
  status?: string
  cycle?: number
  group?: string
  q?: string
}

export type TaskStatus = 'pending' | 'completed' | 'skipped'

export interface Task {
  id: string
  user_id: string
  cycle: number
  anchor_date: string
  exec_date: string
  exec_time?: string
  from_bank_id: string
  to_bank_id: string
  amount: number
  memo?: string
  notes?: string
  status: TaskStatus
  completed_at?: string
  created_at: string
  from_bank?: Bank
  to_bank?: Bank
}

export interface CompleteTaskRequest {
  notes?: string
}

export interface GenerateTasksRequest {
  strategy_id: string
  group?: string
  cycles?: number
}

export interface BatchDeleteRequest {
  task_ids?: string[]
  delete_all?: boolean
  delete_completed?: boolean
  delete_cycle?: number
}

export interface BatchPostponeRequest {
  task_ids?: string[]
  postpone_today?: boolean
  days?: number
}

export interface LastTaskInfo {
  has_tasks: boolean
  last_exec_date: string | null
  last_cycle: number
  suggested_start_date: string
  suggested_cycle: number
  interval_days: number
}
