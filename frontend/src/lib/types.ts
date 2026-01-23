/**
 * API ????
 * ?? Go ??
 */

// ============================================
// ??????
// ============================================

export interface PagedResult<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export type {
  Bank,
  BankBatchDeleteRequest,
  BankBatchUpdateGroupRequest,
  BankListParams,
  BankWithNextTask,
  CreateBankRequest,
  UpdateBankRequest,
} from '@/domains/bank/types'

export type {
  BatchDeleteRequest,
  BatchPostponeRequest,
  CompleteTaskRequest,
  GenerateTasksRequest,
  LastTaskInfo,
  Task,
  TaskListParams,
  TaskStatus,
} from '@/domains/task/types'

export type {
  CreateStrategyRequest,
  Strategy,
  UpdateStrategyRequest,
} from '@/domains/strategy/types'

export type {
  CreateChannelRequest,
  NotificationChannel,
  NotificationChannelType,
  UpdateChannelRequest,
} from '@/domains/notification/types'

// ============================================
// ??????
// ============================================

// ============================================
// ??????
// ============================================

/** ????? */
export interface DashboardStats {
  total_banks: number
  active_banks: number
  total_tasks: number
  pending_tasks: number
  completed_tasks: number
  total_strategies: number
  total_notifications: number
  // ?????
  total_tasks_year?: number
  completed_tasks_year?: number
  total_tasks_month?: number
  completed_tasks_month?: number
  next_task_date?: string
  days_until_next?: number
  banks_count?: number
}

/** ???? */
export interface RecentActivity {
  id: string
  exec_date: string
  from_bank: string
  to_bank: string
  amount: number
  status: string
}

/** ???? */
export interface TaskDetail {
  id: string
  exec_time?: string
  from_bank_name: string
  to_bank_name: string
  amount: number
  memo?: string
}

/** ????? */
export interface NextDayTasks {
  date: string
  days_until: number
  tasks: TaskDetail[]
}

/** ?????? */
export interface CalendarDay {
  date: string
  task_count: number
  has_pending: boolean
}

/** ????? */
export interface TodayTaskItem {
  id: string
  exec_time?: string
  from_bank_name: string
  to_bank_name: string
  amount: number
  memo?: string
  status: string
}

/** ?????? */
export interface TodayTasksResponse {
  date: string
  tasks: TodayTaskItem[]
  pending_count: number
  completed_count: number
}

// ============================================
// Webhook ????
// ============================================

/** Webhook ?? */
export interface Webhook {
  id: string
  user_id: string
  name: string
  url: string
  secret?: string
  events: string[]
  is_enabled: boolean
  last_triggered_at?: string
  last_status?: number
  created_at: string
}

/** ?? Webhook ?? */
export interface CreateWebhookRequest {
  name: string
  url: string
  secret?: string
  events?: string[]
  is_enabled?: boolean
}

/** ?? Webhook ?? */
export interface UpdateWebhookRequest {
  name?: string
  url?: string
  secret?: string
  events?: string[]
  is_enabled?: boolean
}

/** Webhook ?? */
export interface WebhookLog {
  id: string
  webhook_id: string
  event_type: string
  payload: Record<string, unknown>
  response_status?: number
  error_message?: string
  triggered_at: string
}

// ============================================
// ????????
// ============================================

/** ???? */
export interface ImportResult {
  success_count: number
  error_count: number
  errors: string[]
}

// ============================================
// ??????
// ============================================

/** ???? */
export type UserRole = 'admin' | 'user'

/** ???? */
export interface User {
  id: string
  username: string
  role: UserRole
  nickname: string
  avatar: string
  created_at?: string
}

/** ???? */
export interface AuthResponse {
  access_token: string
  user: User
}

/** ???? */
export interface SystemStatus {
  initialized: boolean
  user_count: number
}

/** ??????????? */
export interface CreateUserRequest {
  username: string
  password: string
  role?: UserRole
  nickname?: string
}

/** ??????????? */
export interface UpdateUserRequest {
  role?: UserRole
  nickname?: string
  avatar?: string
}

/** ??????????? */
export interface ResetPasswordRequest {
  password: string
}

/** ?????? */
export interface ChangePasswordRequest {
  old_password: string
  new_password: string
}

/** ???????? */
export interface UpdateProfileRequest {
  nickname?: string
  avatar?: string
}
