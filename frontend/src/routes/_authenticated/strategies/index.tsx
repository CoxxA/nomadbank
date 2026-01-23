import { createFileRoute } from '@tanstack/react-router'
import { Strategies } from '@/domains/strategy/views/strategies'

export const Route = createFileRoute('/_authenticated/strategies/')({
  component: Strategies,
})
