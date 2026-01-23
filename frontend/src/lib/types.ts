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

export interface BankListParams {
  page?: number
  page_size?: number
  status?: string
  group?: string
  q?: string
}

export interface TaskListParams {
  page?: number
  page_size?: number
  status?: string
  cycle?: number
  group?: string
  q?: string
}

/** ?????? */
export interface Bank {
  id: string
  user_id: string
  name: string
  amount_min: number
  amount_max: number
  strategy_id?: string
  group_name?: string
  is_active: boolean
  created_at: string
  updated_at?: string
  strategy?: Strategy
}

/** ???????????? - ????? */
export interface BankWithNextTask extends Bank {
  next_exec_date?: string
  next_exec_time?: string
  next_to_bank_id?: string
  next_to_bank_name?: string
  next_amount?: number
  next_memo?: string
}

/** ?????? */
export interface CreateBankRequest {
  name: string
  amount_min?: number
  amount_max?: number
  strategy_id?: string
  group_name?: string
  is_active?: boolean
}

/** ?????? */
export interface UpdateBankRequest {
  name?: string
  amount_min?: number
  amount_max?: number
  strategy_id?: string
  group_name?: string
  is_active?: boolean
}

/** ???????? */
export interface BankBatchDeleteRequest {
  bank_ids?: string[]
  delete_all?: boolean
  delete_inactive?: boolean
}

/** ?????????? */
export interface BankBatchUpdateGroupRequest {
  bank_ids: string[]
  group_name?: string | null
}

// ============================================
// ??????
// ============================================

/** ???? */
export type TaskStatus = 'pending' | 'completed' | 'skipped'

/** ???? */
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

/** ?????? */
export interface CompleteTaskRequest {
  notes?: string
}

/** ?????? */
export interface GenerateTasksRequest {
  strategy_id: string
  group?: string
  cycles?: number
}

/** ???????? */
export interface BatchDeleteRequest {
  task_ids?: string[]
  delete_all?: boolean
  delete_completed?: boolean
  delete_cycle?: number
}

/** ???????? */
export interface BatchPostponeRequest {
  task_ids?: string[]
  postpone_today?: boolean
  days?: number
}

/** ?????? */
export interface LastTaskInfo {
  has_tasks: boolean
  last_exec_date: string | null
  last_cycle: number
  suggested_start_date: string
  suggested_cycle: number
  interval_days: number
}

// ============================================
// ??????
// ============================================

/** ???? */
export interface Strategy {
  id: string
  user_id: string
  name: string
  // ????
  interval_min: number
  interval_max: number
  time_start: string
  time_end: string
  skip_weekend: boolean
  // ????
  amount_min: number
  amount_max: number
  // ????
  daily_limit: number
  // ???
  is_system: boolean
  created_at: string
  updated_at?: string
}

/** ?????? */
export interface CreateStrategyRequest {
  name: string
  interval_min?: number
  interval_max?: number
  time_start?: string
  time_end?: string
  skip_weekend?: boolean
  amount_min?: number
  amount_max?: number
  daily_limit?: number
}

/** ?????? */
export interface UpdateStrategyRequest {
  name?: string
  interval_min?: number
  interval_max?: number
  time_start?: string
  time_end?: string
  skip_weekend?: boolean
  amount_min?: number
  amount_max?: number
  daily_limit?: number
}

// ============================================
// ??????
// ============================================

/** ?????? */
export type NotificationChannelType = 'bark' | 'telegram' | 'webhook'

/** ?????? */
export interface NotificationChannel {
  id: string
  user_id: string
  name: string
  type: NotificationChannelType
  config: Record<string, unknown>
  is_enabled: boolean
  created_at: string
  updated_at?: string
}

/** ???????? */
export interface CreateChannelRequest {
  name: string
  type: NotificationChannelType
  config: Record<string, unknown>
  is_enabled?: boolean
}

/** ???????? */
export interface UpdateChannelRequest {
  name?: string
  type?: NotificationChannelType
  config?: Record<string, unknown>
  is_enabled?: boolean
}

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
