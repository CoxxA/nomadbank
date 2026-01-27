export type NotificationChannelType = 'bark' | 'telegram' | 'webhook'

// 具体的通知配置类型
export interface BarkConfig {
  device_key: string
  server_url?: string
}

export interface TelegramConfig {
  bot_token: string
  chat_id: string
}

export interface WebhookConfig {
  url: string
  secret?: string
}

// 通知配置联合类型
export type NotificationConfig = BarkConfig | TelegramConfig | WebhookConfig

// 根据类型推断配置
export type ConfigForType<T extends NotificationChannelType> = T extends 'bark'
  ? BarkConfig
  : T extends 'telegram'
    ? TelegramConfig
    : T extends 'webhook'
      ? WebhookConfig
      : never

export interface NotificationChannel {
  id: string
  user_id: string
  name: string
  type: NotificationChannelType
  config: NotificationConfig
  is_enabled: boolean
  created_at: string
  updated_at?: string
}

export interface CreateChannelRequest {
  name: string
  type: NotificationChannelType
  config: NotificationConfig
  is_enabled?: boolean
}

export interface UpdateChannelRequest {
  name?: string
  type?: NotificationChannelType
  config?: NotificationConfig
  is_enabled?: boolean
}
