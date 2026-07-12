import { queryOptions } from '@tanstack/react-query'
import { jsonBody, request } from '@/api/client'
import type { Account, AccountInput } from '@/api/types'

export const accountKeys = {
  all: ['accounts'] as const,
}

export const accountsQuery = queryOptions({
  queryKey: accountKeys.all,
  queryFn: () => request<Account[]>('/api/v1/accounts'),
})

export const createAccount = (input: AccountInput): Promise<Account> =>
  request('/api/v1/accounts', { method: 'POST', body: jsonBody(input) })

export const updateAccount = (id: number, input: AccountInput): Promise<Account> =>
  request(`/api/v1/accounts/${id}`, {
    method: 'PUT',
    body: jsonBody(input),
  })

export const deleteAccount = (id: number): Promise<void> =>
  request(`/api/v1/accounts/${id}`, { method: 'DELETE' })
