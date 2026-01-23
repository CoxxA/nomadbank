import { api, toParams } from '@/lib/api'
import type {
  Bank,
  BankBatchDeleteRequest,
  BankBatchUpdateGroupRequest,
  BankListParams,
  BankWithNextTask,
  CreateBankRequest,
  UpdateBankRequest,
} from './types'
import type { PagedResult } from '@/lib/types'

/** 银行 API */
export const banksApi = {
  list: (params?: BankListParams) =>
    api.get<PagedResult<BankWithNextTask>>('/api/v1/banks', toParams(params)),
  listWithNextTasks: (params?: BankListParams) =>
    api.get<PagedResult<BankWithNextTask>>('/api/v1/banks', toParams(params)),
  getGroups: () => api.get<{ groups: string[] }>('/api/v1/banks/groups'),
  get: (id: string) => api.get<Bank>(`/api/v1/banks/${id}`),
  create: (data: CreateBankRequest) => api.post<Bank>('/api/v1/banks', data),
  update: (id: string, data: UpdateBankRequest) =>
    api.put<Bank>(`/api/v1/banks/${id}`, data),
  delete: (id: string) => api.delete(`/api/v1/banks/${id}`),
  batchDelete: async (data: BankBatchDeleteRequest) => {
    // 简化实现：逐个删除
    if (data.bank_ids) {
      for (const id of data.bank_ids) {
        await api.delete(`/api/v1/banks/${id}`)
      }
    }
    return { message: '删除成功', deleted_count: data.bank_ids?.length || 0 }
  },
  batchUpdateGroup: async (data: BankBatchUpdateGroupRequest) => {
    // 简化实现：逐个更新
    for (const id of data.bank_ids) {
      await api.put(`/api/v1/banks/${id}`, { group_name: data.group_name })
    }
    return { message: '更新成功', updated_count: data.bank_ids.length }
  },
}
