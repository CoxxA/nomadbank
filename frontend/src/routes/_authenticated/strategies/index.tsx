import { createFileRoute } from '@tanstack/react-router'
import { Strategies } from '@/features/strategies'

export const Route = createFileRoute('/_authenticated/strategies/')({
  component: Strategies,
})
