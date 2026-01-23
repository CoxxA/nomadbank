export type NotificationChannelType = 'bark' | 'telegram' | 'webhook'

export interface NotificationChannel {
  id: string
  user_id: string
  name: string
  type: NotificationChannelType
  config: Record<string, unknown>
  is_enabled: boolean
  created_at: string
  updated_at?: string
}

export interface CreateChannelRequest {
  name: string
  type: NotificationChannelType
  config: Record<string, unknown>
  is_enabled?: boolean
}

export interface UpdateChannelRequest {
  name?: string
  type?: NotificationChannelType
  config?: Record<string, unknown>
  is_enabled?: boolean
}
