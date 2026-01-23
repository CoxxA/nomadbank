import { createFileRoute } from '@tanstack/react-router'
import { Dashboard } from '@/domains/dashboard/views/dashboard'

export const Route = createFileRoute('/_authenticated/')({
  component: Dashboard,
})
