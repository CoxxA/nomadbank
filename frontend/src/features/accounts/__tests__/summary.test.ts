import { getAccountsSummary } from '../summary'
import type { BankWithNextTask } from '@/lib/types'

const makeBank = (overrides: Partial<BankWithNextTask>): BankWithNextTask => ({
  id: 'bank-id',
  user_id: 'user-id',
  name: 'Test Bank',
  amount_min: 10,
  amount_max: 20,
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
})

it('computes totals and active counts', () => {
  const result = getAccountsSummary([
    makeBank({ is_active: true }),
    makeBank({ is_active: false }),
  ])

  expect(result.total).toBe(2)
  expect(result.active).toBe(1)
  expect(result.inactive).toBe(1)
})

it('picks the earliest next transfer', () => {
  const result = getAccountsSummary([
    makeBank({
      next_exec_date: '2025-02-10',
      next_exec_time: '09:00:00',
      next_to_bank_name: 'B Bank',
      next_amount: 50,
    }),
    makeBank({
      next_exec_date: '2025-02-05',
      next_exec_time: '08:00:00',
      next_to_bank_name: 'A Bank',
      next_amount: 20,
    }),
  ])

  expect(result.nextTransfer?.toBank).toBe('A Bank')
  expect(result.nextTransfer?.amount).toBe(20)
  expect(result.nextTransfer?.date).toBe('2025-02-05')
})
