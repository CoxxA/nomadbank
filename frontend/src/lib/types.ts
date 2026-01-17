/**
 * API 类型定义
 * 适配 Go 后端
 */

// ============================================
// 银行相关类型
// ============================================

/** 标签简要信息 */
export interface TagInfo {
  id: string
  name: string
  color: string
}

/** 银行基础信息 */
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

/** 银行信息（含下一个任务） - 兼容旧前端 */
export interface BankWithNextTask extends Bank {
  next_exec_date?: string
  next_exec_time?: string
  next_to_bank_name?: string
  next_amount?: number
  next_memo?: string
  last_exec_date?: string
  tags?: TagInfo[]
}

/** 创建银行请求 */
export interface CreateBankRequest {
  name: string
  amount_min?: number
  amount_max?: number
  strategy_id?: string
  group_name?: string
  is_active?: boolean
}

/** 更新银行请求 */
export interface UpdateBankRequest {
  name?: string
  amount_min?: number
  amount_max?: number
  strategy_id?: string
  group_name?: string
  is_active?: boolean
}

/** 批量删除银行请求 */
export interface BankBatchDeleteRequest {
  bank_ids?: string[]
  delete_all?: boolean
  delete_inactive?: boolean
}

/** 批量更新银行分组请求 */
export interface BankBatchUpdateGroupRequest {
  bank_ids: string[]
  group_name?: string | null
}

// ============================================
// 任务相关类型
// ============================================

/** 任务状态 */
export type TaskStatus = 'pending' | 'completed' | 'skipped'

/** 任务信息 */
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

/** 完成任务请求 */
export interface CompleteTaskRequest {
  notes?: string
}

/** 生成任务请求 */
export interface GenerateTasksRequest {
  strategy_id: string
  group?: string
  cycles?: number
}

/** 批量删除任务请求 */
export interface BatchDeleteRequest {
  task_ids?: string[]
  delete_all?: boolean
  delete_completed?: boolean
  delete_cycle?: number
}

/** 批量推迟任务请求 */
export interface BatchPostponeRequest {
  task_ids?: string[]
  postpone_today?: boolean
  days?: number
}

/** 最后任务信息 */
export interface LastTaskInfo {
  has_tasks: boolean
  last_exec_date: string | null
  last_cycle: number
  suggested_start_date: string
  suggested_cycle: number
  interval_days: number
}

// ============================================
// 策略相关类型
// ============================================

/** 策略信息 */
export interface Strategy {
  id: string
  user_id: string
  name: string
  // 时间配置
  interval_min: number
  interval_max: number
  time_start: string
  time_end: string
  skip_weekend: boolean
  // 金额配置
  amount_min: number
  amount_max: number
  // 任务配置
  daily_limit: number
  // 元信息
  is_system: boolean
  created_at: string
  updated_at?: string
}

/** 创建策略请求 */
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

/** 更新策略请求 */
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
// 通知相关类型
// ============================================

/** 通知渠道类型 */
export type NotificationChannelType = 'bark' | 'telegram' | 'webhook'

/** 通知渠道信息 */
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

/** 创建通知渠道请求 */
export interface CreateChannelRequest {
  name: string
  type: NotificationChannelType
  config: Record<string, unknown>
  is_enabled?: boolean
}

/** 更新通知渠道请求 */
export interface UpdateChannelRequest {
  name?: string
  type?: NotificationChannelType
  config?: Record<string, unknown>
  is_enabled?: boolean
}

// ============================================
// 统计相关类型
// ============================================

/** 仪表盘统计 */
export interface DashboardStats {
  total_banks: number
  active_banks: number
  total_tasks: number
  pending_tasks: number
  completed_tasks: number
  total_strategies: number
  total_notifications: number
  // 兼容旧字段
  total_tasks_year?: number
  completed_tasks_year?: number
  total_tasks_month?: number
  completed_tasks_month?: number
  next_task_date?: string
  days_until_next?: number
  banks_count?: number
}

/** 最近活动 */
export interface RecentActivity {
  id: string
  exec_date: string
  from_bank: string
  to_bank: string
  amount: number
  status: string
}

/** 任务详情 */
export interface TaskDetail {
  id: string
  exec_time?: string
  from_bank_name: string
  to_bank_name: string
  amount: number
  memo?: string
}

/** 下一天任务 */
export interface NextDayTasks {
  date: string
  days_until: number
  tasks: TaskDetail[]
}

/** 日历日期数据 */
export interface CalendarDay {
  date: string
  task_count: number
  has_pending: boolean
}

/** 今日任务项 */
export interface TodayTaskItem {
  id: string
  exec_time?: string
  from_bank_name: string
  to_bank_name: string
  amount: number
  memo?: string
  status: string
}

/** 今日任务响应 */
export interface TodayTasksResponse {
  date: string
  tasks: TodayTaskItem[]
  pending_count: number
  completed_count: number
}

// ============================================
// 标签相关类型
// ============================================

/** 标签信息 */
export interface Tag {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
}

/** 创建标签请求 */
export interface CreateTagRequest {
  name: string
  color?: string
}

/** 更新标签请求 */
export interface UpdateTagRequest {
  name?: string
  color?: string
}

/** 更新银行标签请求 */
export interface UpdateBankTagsRequest {
  tag_ids: string[]
}

// ============================================
// Webhook 相关类型
// ============================================

/** Webhook 信息 */
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

/** 创建 Webhook 请求 */
export interface CreateWebhookRequest {
  name: string
  url: string
  secret?: string
  events?: string[]
  is_enabled?: boolean
}

/** 更新 Webhook 请求 */
export interface UpdateWebhookRequest {
  name?: string
  url?: string
  secret?: string
  events?: string[]
  is_enabled?: boolean
}

/** Webhook 日志 */
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
// 导入导出相关类型
// ============================================

/** 导入结果 */
export interface ImportResult {
  success_count: number
  error_count: number
  errors: string[]
}

// ============================================
// 认证相关类型
// ============================================

/** 用户角色 */
export type UserRole = 'admin' | 'user'

/** 用户信息 */
export interface User {
  id: string
  username: string
  role: UserRole
  nickname: string
  avatar: string
  created_at?: string
}

/** 认证响应 */
export interface AuthResponse {
  access_token: string
  user: User
}

/** 系统状态 */
export interface SystemStatus {
  initialized: boolean
  user_count: number
}

/** 创建用户请求（管理员） */
export interface CreateUserRequest {
  username: string
  password: string
  role?: UserRole
  nickname?: string
}

/** 更新用户请求（管理员） */
export interface UpdateUserRequest {
  role?: UserRole
  nickname?: string
  avatar?: string
}

/** 重置密码请求（管理员） */
export interface ResetPasswordRequest {
  password: string
}

/** 修改密码请求 */
export interface ChangePasswordRequest {
  old_password: string
  new_password: string
}

/** 更新个人资料请求 */
export interface UpdateProfileRequest {
  nickname?: string
  avatar?: string
}
