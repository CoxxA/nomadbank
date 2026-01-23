export interface Strategy {
  id: string
  user_id: string
  name: string
  // 间隔
  interval_min: number
  interval_max: number
  time_start: string
  time_end: string
  skip_weekend: boolean
  // 金额
  amount_min: number
  amount_max: number
  // 限制
  daily_limit: number
  // 系统
  is_system: boolean
  created_at: string
  updated_at?: string
}

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
