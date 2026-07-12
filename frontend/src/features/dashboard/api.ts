import { queryOptions } from '@tanstack/react-query'
import { request } from '@/api/client'
import type { Dashboard } from '@/api/types'

export const dashboardQuery = queryOptions({
  queryKey: ['dashboard'] as const,
  queryFn: () => request<Dashboard>('/api/v1/dashboard'),
})
