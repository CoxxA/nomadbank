import { createFileRoute } from '@tanstack/react-router'
import { Accounts } from '@/domains/bank/views/accounts'

export const Route = createFileRoute('/_authenticated/accounts/')({
  component: Accounts,
})
