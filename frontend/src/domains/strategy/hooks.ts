import { useQuery } from '@tanstack/react-query'
import { strategiesApi } from './api'
import type { Strategy } from './types'
import { queryKeys } from '@/hooks/use-queries'

/** 获取策略列表 */
export function useStrategies() {
  return useQuery<Strategy[]>({
    queryKey: queryKeys.strategies,
    queryFn: () => strategiesApi.list(),
  })
}
