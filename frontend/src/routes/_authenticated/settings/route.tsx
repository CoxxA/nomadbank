import { createFileRoute } from '@tanstack/react-router'
import { Settings } from '@/domains/settings'

export const Route = createFileRoute('/_authenticated/settings')({
  component: Settings,
})
