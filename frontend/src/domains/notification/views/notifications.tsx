/**
 * 通知设置页面
 */
import { useState } from 'react'
import {
  Bell,
  CheckCircle2,
  Clock,
  Loader2,
  MessageCircle,
  Plus,
  Send,
  Smartphone,
  Trash2,
  Webhook as WebhookIcon,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page/page-header'
import { useRefreshQueries, useWebhooks } from '@/hooks/use-queries'
import { webhooksApi } from '@/lib/api'
import { handleApiError } from '@/lib/handle-server-error'
import type { CreateWebhookRequest, Webhook } from '@/lib/types'
import { parseDateKey } from '@/lib/utils'
import { notificationsApi } from '@/domains/notification/api'
import { useNotificationChannels } from '@/domains/notification/hooks'
import type {
  BarkConfig,
  CreateChannelRequest,
  NotificationChannel,
  TelegramConfig,
} from '@/domains/notification/types'

// 支持的 webhook 事件类型
const WEBHOOK_EVENTS = [
  { value: 'task.completed', label: '任务完成' },
  { value: 'task.created', label: '任务创建' },
  { value: 'task.skipped', label: '任务跳过' },
  { value: 'daily.reminder', label: '每日提醒' },
]

export function Notifications() {
  const { refreshNotificationChannels, refreshWebhooks } = useRefreshQueries()

  // 使用 TanStack Query hooks 加载数据（自动缓存）
  const { data: channels = [], isLoading: loading } = useNotificationChannels()
  const { data: webhooks = [], isLoading: webhooksLoading } = useWebhooks()

  const [activeTab, setActiveTab] = useState<'channels' | 'webhooks'>(
    'channels'
  )
  const [dialogOpen, setDialogOpen] = useState(false)
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false)
  const [channelType, setChannelType] = useState<'bark' | 'telegram'>('bark')
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [webhookFormData, setWebhookFormData] = useState<CreateWebhookRequest>({
    name: '',
    url: '',
    secret: '',
    events: ['task.completed'],
  })
  const [submitting, setSubmitting] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null)

  // 添加渠道
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const config =
        channelType === 'bark'
          ? (formData as unknown as BarkConfig)
          : (formData as unknown as TelegramConfig)
      const request: CreateChannelRequest = {
        name: channelType === 'bark' ? 'Bark 通知' : 'Telegram 通知',
        type: channelType,
        config,
        is_enabled: true,
      }
      await notificationsApi.createChannel(request)
      toast.success('添加成功')
      setDialogOpen(false)
      setFormData({})
      refreshNotificationChannels()
    } catch (error) {
      handleApiError(error, '添加失败')
    } finally {
      setSubmitting(false)
    }
  }

  // 删除渠道
  const handleDelete = async (channel: NotificationChannel) => {
    if (!confirm('确定要删除这个通知渠道吗？')) return

    try {
      await notificationsApi.deleteChannel(channel.id)
      toast.success('删除成功')
      refreshNotificationChannels()
    } catch (error) {
      handleApiError(error, '删除失败')
    }
  }

  // 切换启用状态
  const handleToggle = async (channel: NotificationChannel) => {
    try {
      await notificationsApi.updateChannel(channel.id, {
        is_enabled: !channel.is_enabled,
      })
      toast.success(channel.is_enabled ? '已停用' : '已启用')
      refreshNotificationChannels()
    } catch (error) {
      handleApiError(error, '操作失败')
    }
  }

  // 测试通知
  const handleTest = async (channel: NotificationChannel) => {
    setTestingId(channel.id)
    try {
      await notificationsApi.test(
        channel.id,
        '这是一条测试通知，来自 NomadBankKeeper'
      )
      toast.success('测试通知已发送')
    } catch (error) {
      handleApiError(error, '发送测试通知失败')
    } finally {
      setTestingId(null)
    }
  }

  // 获取渠道图标
  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'bark':
        return <Smartphone className='h-5 w-5' />
      case 'telegram':
        return <MessageCircle className='h-5 w-5' />
      default:
        return <Bell className='h-5 w-5' />
    }
  }

  // 获取渠道名称
  const getChannelName = (type: string) => {
    switch (type) {
      case 'bark':
        return 'Bark'
      case 'telegram':
        return 'Telegram'
      default:
        return type
    }
  }

  // Webhook 相关操作
  const handleAddWebhook = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      await webhooksApi.create(webhookFormData)
      toast.success('Webhook 添加成功')
      setWebhookDialogOpen(false)
      setWebhookFormData({
        name: '',
        url: '',
        secret: '',
        events: ['task.completed'],
      })
      refreshWebhooks()
    } catch (error) {
      handleApiError(error, '添加 Webhook 失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteWebhook = async (webhook: Webhook) => {
    if (!confirm(`确定要删除 Webhook "${webhook.name}" 吗？`)) return

    try {
      await webhooksApi.delete(webhook.id)
      toast.success('删除成功')
      refreshWebhooks()
    } catch (error) {
      handleApiError(error, '删除失败')
    }
  }

  const handleToggleWebhook = async (webhook: Webhook) => {
    try {
      await webhooksApi.update(webhook.id, { is_enabled: !webhook.is_enabled })
      toast.success(webhook.is_enabled ? '已停用' : '已启用')
      refreshWebhooks()
    } catch (error) {
      handleApiError(error, '操作失败')
    }
  }

  const handleTestWebhook = async (webhook: Webhook) => {
    setTestingWebhookId(webhook.id)
    try {
      await webhooksApi.test(webhook.id)
      toast.success('测试 Webhook 已发送')
    } catch (error) {
      handleApiError(error, '发送测试失败')
    } finally {
      setTestingWebhookId(null)
    }
  }

  const toggleWebhookEvent = (event: string) => {
    const events = webhookFormData.events || []
    if (events.includes(event)) {
      setWebhookFormData({
        ...webhookFormData,
        events: events.filter((e) => e !== event),
      })
    } else {
      setWebhookFormData({
        ...webhookFormData,
        events: [...events, event],
      })
    }
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'channels' | 'webhooks')
    setDialogOpen(false)
    setWebhookDialogOpen(false)
  }

  const getStatusBadge = (webhook: Webhook) => {
    if (!webhook.last_triggered_at) {
      return (
        <Badge variant='outline' className='text-muted-foreground'>
          <Clock className='mr-1 h-3 w-3' />
          未触发
        </Badge>
      )
    }
    if (
      webhook.last_status &&
      webhook.last_status >= 200 &&
      webhook.last_status < 300
    ) {
      return (
        <Badge variant='outline' className='text-green-600 dark:text-green-400'>
          <CheckCircle2 className='mr-1 h-3 w-3' />
          {webhook.last_status}
        </Badge>
      )
    }
    return (
      <Badge variant='outline' className='text-red-600 dark:text-red-400'>
        <XCircle className='mr-1 h-3 w-3' />
        {webhook.last_status || '失败'}
      </Badge>
    )
  }

  const channelDialog = (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button size='sm'>
          <Plus className='h-4 w-4' />
          添加渠道
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleAdd}>
          <DialogHeader>
            <DialogTitle>添加通知渠道</DialogTitle>
            <DialogDescription>配置通知推送服务</DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='space-y-2'>
              <Label>渠道类型</Label>
              <Select
                value={channelType}
                onValueChange={(v) => {
                  setChannelType(v as 'bark' | 'telegram')
                  setFormData({})
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='bark'>Bark (iOS)</SelectItem>
                  <SelectItem value='telegram'>Telegram</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bark 配置 */}
            {channelType === 'bark' && (
              <>
                <div className='space-y-2'>
                  <Label htmlFor='device_key'>Device Key *</Label>
                  <Input
                    id='device_key'
                    placeholder='从 Bark App 获取'
                    value={formData.device_key || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        device_key: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='server_url'>服务器地址（可选）</Label>
                  <Input
                    id='server_url'
                    placeholder='默认：https://api.day.app'
                    value={formData.server_url || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        server_url: e.target.value,
                      })
                    }
                  />
                </div>
              </>
            )}

            {/* Telegram 配置 */}
            {channelType === 'telegram' && (
              <>
                <div className='space-y-2'>
                  <Label htmlFor='bot_token'>Bot Token *</Label>
                  <Input
                    id='bot_token'
                    placeholder='从 @BotFather 获取'
                    value={formData.bot_token || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bot_token: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='chat_id'>Chat ID *</Label>
                  <Input
                    id='chat_id'
                    placeholder='你的 Telegram Chat ID'
                    value={formData.chat_id || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        chat_id: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => setDialogOpen(false)}
            >
              取消
            </Button>
            <Button type='submit' disabled={submitting}>
              {submitting && <Loader2 className='h-4 w-4 animate-spin' />}
              添加
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )

  const webhookDialog = (
    <Dialog open={webhookDialogOpen} onOpenChange={setWebhookDialogOpen}>
      <DialogTrigger asChild>
        <Button size='sm'>
          <Plus className='h-4 w-4' />
          添加 Webhook
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleAddWebhook}>
          <DialogHeader>
            <DialogTitle>添加 Webhook</DialogTitle>
            <DialogDescription>任务完成时触发外部服务</DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='space-y-2'>
              <Label htmlFor='webhook_name'>名称 *</Label>
              <Input
                id='webhook_name'
                placeholder='例如：自动记账'
                value={webhookFormData.name}
                onChange={(e) =>
                  setWebhookFormData({
                    ...webhookFormData,
                    name: e.target.value,
                  })
                }
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='webhook_url'>URL *</Label>
              <Input
                id='webhook_url'
                type='url'
                placeholder='https://example.com/webhook'
                value={webhookFormData.url}
                onChange={(e) =>
                  setWebhookFormData({
                    ...webhookFormData,
                    url: e.target.value,
                  })
                }
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='webhook_secret'>Secret（可选）</Label>
              <Input
                id='webhook_secret'
                placeholder='用于签名验证'
                value={webhookFormData.secret || ''}
                onChange={(e) =>
                  setWebhookFormData({
                    ...webhookFormData,
                    secret: e.target.value,
                  })
                }
              />
            </div>
            <div className='space-y-2'>
              <Label>触发事件</Label>
              <div className='space-y-2'>
                {WEBHOOK_EVENTS.map((event) => (
                  <div
                    key={event.value}
                    className='flex items-center space-x-2'
                  >
                    <Checkbox
                      id={event.value}
                      checked={webhookFormData.events?.includes(event.value)}
                      onCheckedChange={() => toggleWebhookEvent(event.value)}
                    />
                    <label
                      htmlFor={event.value}
                      className='text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                    >
                      {event.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => setWebhookDialogOpen(false)}
            >
              取消
            </Button>
            <Button type='submit' disabled={submitting}>
              {submitting && <Loader2 className='h-4 w-4 animate-spin' />}
              添加
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )

  return (
    <>
      <Main>
        <div className='space-y-6'>
          <PageHeader
            title='通知设置'
            description='管理任务通知渠道与 Webhook 配置'
            actions={
              <>{activeTab === 'channels' ? channelDialog : webhookDialog}</>
            }
          />

          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className='gap-6'
          >
            <Card className='border-border/60 bg-white/80'>
              <CardHeader className='pb-3'>
                <TabsList>
                  <TabsTrigger value='channels'>
                    <Bell className='mr-2 h-4 w-4' />
                    推送渠道
                  </TabsTrigger>
                  <TabsTrigger value='webhooks'>
                    <WebhookIcon className='mr-2 h-4 w-4' />
                    Webhooks
                  </TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent className='pt-0'>
                {/* 推送渠道 Tab */}
                <TabsContent value='channels' className='space-y-4'>
                  {loading ? (
                    <div className='flex items-center justify-center py-12'>
                      <Loader2 className='text-muted-foreground h-8 w-8 animate-spin' />
                    </div>
                  ) : channels.length === 0 ? (
                    <Card>
                      <CardContent className='py-12 text-center'>
                        <Bell className='text-muted-foreground/50 mx-auto h-12 w-12' />
                        <p className='text-muted-foreground mt-4'>
                          暂无通知渠道，点击&quot;添加渠道&quot;开始配置
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className='grid gap-4 md:grid-cols-2'>
                      {channels.map((channel) => (
                        <Card key={channel.id}>
                          <CardHeader className='flex flex-row items-center justify-between pb-2'>
                            <div className='flex items-center gap-3'>
                              {getChannelIcon(channel.type)}
                              <div>
                                <CardTitle className='text-base'>
                                  {getChannelName(channel.type)}
                                </CardTitle>
                                <CardDescription className='text-xs'>
                                  添加于{' '}
                                  {parseDateKey(
                                    channel.created_at
                                  ).toLocaleDateString('zh-CN')}
                                </CardDescription>
                              </div>
                            </div>
                            <Switch
                              checked={channel.is_enabled}
                              onCheckedChange={() => handleToggle(channel)}
                            />
                          </CardHeader>
                          <CardContent>
                            <div className='flex gap-2'>
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={() => handleTest(channel)}
                                disabled={
                                  testingId === channel.id ||
                                  !channel.is_enabled
                                }
                              >
                                {testingId === channel.id ? (
                                  <Loader2 className='h-4 w-4 animate-spin' />
                                ) : (
                                  <Send className='h-4 w-4' />
                                )}
                                测试
                              </Button>
                              <Button
                                variant='outline'
                                size='sm'
                                className='text-destructive'
                                onClick={() => handleDelete(channel)}
                              >
                                <Trash2 className='h-4 w-4' />
                                删除
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Webhooks Tab */}
                <TabsContent value='webhooks' className='space-y-4'>
                  {webhooksLoading ? (
                    <div className='flex items-center justify-center py-12'>
                      <Loader2 className='text-muted-foreground h-8 w-8 animate-spin' />
                    </div>
                  ) : webhooks.length === 0 ? (
                    <Card>
                      <CardContent className='py-12 text-center'>
                        <WebhookIcon className='text-muted-foreground/50 mx-auto h-12 w-12' />
                        <p className='text-muted-foreground mt-4'>
                          暂无 Webhook，点击&quot;添加 Webhook&quot;开始配置
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className='grid gap-4 md:grid-cols-2'>
                      {webhooks.map((webhook) => (
                        <Card key={webhook.id}>
                          <CardHeader className='flex flex-row items-center justify-between pb-2'>
                            <div className='flex items-center gap-3'>
                              <WebhookIcon className='h-5 w-5' />
                              <div>
                                <CardTitle className='text-base'>
                                  {webhook.name}
                                </CardTitle>
                                <CardDescription className='max-w-48 truncate text-xs'>
                                  {webhook.url}
                                </CardDescription>
                              </div>
                            </div>
                            <Switch
                              checked={webhook.is_enabled}
                              onCheckedChange={() =>
                                handleToggleWebhook(webhook)
                              }
                            />
                          </CardHeader>
                          <CardContent className='space-y-3'>
                            <div className='flex flex-wrap gap-1'>
                              {webhook.events.map((event) => (
                                <Badge
                                  key={event}
                                  variant='secondary'
                                  className='text-xs'
                                >
                                  {WEBHOOK_EVENTS.find((e) => e.value === event)
                                    ?.label || event}
                                </Badge>
                              ))}
                            </div>
                            <div className='flex items-center justify-between'>
                              <div className='flex items-center gap-2'>
                                {getStatusBadge(webhook)}
                                {webhook.last_triggered_at && (
                                  <span className='text-muted-foreground text-xs'>
                                    {new Date(
                                      webhook.last_triggered_at
                                    ).toLocaleString('zh-CN')}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className='flex gap-2'>
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={() => handleTestWebhook(webhook)}
                                disabled={
                                  testingWebhookId === webhook.id ||
                                  !webhook.is_enabled
                                }
                              >
                                {testingWebhookId === webhook.id ? (
                                  <Loader2 className='h-4 w-4 animate-spin' />
                                ) : (
                                  <Send className='h-4 w-4' />
                                )}
                                测试
                              </Button>
                              <Button
                                variant='outline'
                                size='sm'
                                className='text-destructive'
                                onClick={() => handleDeleteWebhook(webhook)}
                              >
                                <Trash2 className='h-4 w-4' />
                                删除
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </CardContent>
            </Card>
          </Tabs>
        </div>
      </Main>
    </>
  )
}
