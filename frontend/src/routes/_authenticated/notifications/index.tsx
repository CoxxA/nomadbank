import { createFileRoute } from '@tanstack/react-router'
import { Notifications } from '@/domains/notification/views/notifications'

export const Route = createFileRoute('/_authenticated/notifications/')({
  component: Notifications,
})
