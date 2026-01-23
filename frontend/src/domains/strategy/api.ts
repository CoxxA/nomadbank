import { api } from '@/lib/api-client'
import type {
  CreateStrategyRequest,
  Strategy,
  UpdateStrategyRequest,
} from './types'

/** 策略 API */
export const strategiesApi = {
  list: () => api.get<Strategy[]>('/api/v1/strategies'),
  get: (id: string) => api.get<Strategy>(`/api/v1/strategies/${id}`),
  create: (data: CreateStrategyRequest) =>
    api.post<Strategy>('/api/v1/strategies', data),
  update: (id: string, data: UpdateStrategyRequest) =>
    api.put<Strategy>(`/api/v1/strategies/${id}`, data),
  delete: (id: string) => api.delete(`/api/v1/strategies/${id}`),
}
