import { createFileRoute } from '@tanstack/react-router'
import { Tasks } from '@/domains/task/views/tasks'

export const Route = createFileRoute('/_authenticated/tasks/')({
  component: Tasks,
})
