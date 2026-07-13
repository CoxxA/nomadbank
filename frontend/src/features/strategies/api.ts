import { queryOptions } from '@tanstack/react-query'
import { jsonBody, request } from '@/api/client'
import type { Strategy, StrategyInput } from '@/api/types'

export const strategyKeys = {
  all: ['strategies'] as const,
}

export const strategiesQuery = queryOptions({
  queryKey: strategyKeys.all,
  queryFn: () => request<Strategy[]>('/api/v1/strategies'),
})

export const createStrategy = (input: StrategyInput): Promise<Strategy> =>
  request('/api/v1/strategies', { method: 'POST', body: jsonBody(input) })

export const updateStrategy = (id: number, input: StrategyInput): Promise<Strategy> =>
  request(`/api/v1/strategies/${id}`, {
    method: 'PUT',
    body: jsonBody(input),
  })

export const deleteStrategy = (id: number): Promise<void> =>
  request(`/api/v1/strategies/${id}`, { method: 'DELETE' })
