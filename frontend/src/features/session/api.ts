import { queryOptions } from '@tanstack/react-query'
import { jsonBody, request } from '@/api/client'
import type { Owner, SetupInput, SetupStatus } from '@/api/types'

export const sessionKeys = {
  setup: ['setup'] as const,
  me: ['session', 'me'] as const,
}

export const setupStatusQuery = queryOptions({
  queryKey: sessionKeys.setup,
  queryFn: () => request<SetupStatus>('/api/v1/setup'),
  staleTime: 30_000,
})

export const meQuery = queryOptions({
  queryKey: sessionKeys.me,
  queryFn: () => request<Owner>('/api/v1/me'),
  retry: false,
  staleTime: 60_000,
})

export const setup = (input: SetupInput): Promise<Owner> =>
  request('/api/v1/setup', { method: 'POST', body: jsonBody(input) })

export const login = (username: string, password: string): Promise<Owner> =>
  request('/api/v1/session', {
    method: 'POST',
    body: jsonBody({ username, password }),
  })

export const logout = (): Promise<void> => request('/api/v1/session', { method: 'DELETE' })

export const updateOwner = (displayName: string, timezone: string): Promise<Owner> =>
  request('/api/v1/me', {
    method: 'PUT',
    body: jsonBody({ display_name: displayName, timezone }),
  })

export const changePassword = (currentPassword: string, newPassword: string): Promise<void> =>
  request('/api/v1/me/password', {
    method: 'PUT',
    body: jsonBody({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  })
