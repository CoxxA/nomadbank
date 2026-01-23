import type { Strategy } from '@/domains/strategy/types'

export interface BankListParams {
  page?: number
  page_size?: number
  status?: string
  group?: string
  q?: string
}

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

export interface BankWithNextTask extends Bank {
  next_exec_date?: string
  next_exec_time?: string
  next_to_bank_id?: string
  next_to_bank_name?: string
  next_amount?: number
  next_memo?: string
}

export interface CreateBankRequest {
  name: string
  amount_min?: number
  amount_max?: number
  strategy_id?: string
  group_name?: string
  is_active?: boolean
}

export interface UpdateBankRequest {
  name?: string
  amount_min?: number
  amount_max?: number
  strategy_id?: string
  group_name?: string
  is_active?: boolean
}

export interface BankBatchDeleteRequest {
  bank_ids?: string[]
  delete_all?: boolean
  delete_inactive?: boolean
}

export interface BankBatchUpdateGroupRequest {
  bank_ids: string[]
  group_name?: string | null
}
