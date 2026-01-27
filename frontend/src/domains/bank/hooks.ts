import { useQuery } from '@tanstack/react-query'
import { banksApi } from './api'
import type { BankListParams, BankWithNextTask } from './types'
import type { PagedResult } from '@/lib/types'
import { queryKeys } from '@/hooks/use-queries'

/** 获取银行列表（含下一个任务） */
export function useBanksWithNextTasks(params?: BankListParams) {
  return useQuery<PagedResult<BankWithNextTask>>({
    queryKey: queryKeys.banksWithTasks(params),
    queryFn: () => banksApi.listWithNextTasks(params),
    // 任务变化会影响下次执行信息，每次访问页面都重新获取
    staleTime: 0,
  })
}

/** 获取银行分组列表 */
export function useBankGroups() {
  return useQuery<{ groups: string[] }>({
    queryKey: queryKeys.bankGroups,
    queryFn: () => banksApi.getGroups(),
  })
}
