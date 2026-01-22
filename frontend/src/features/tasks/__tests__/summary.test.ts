import { getTasksSummary } from '../summary'
import type { Task } from '@/lib/types'

const makeTask = (overrides: Partial<Task>): Task => ({
  id: 'task-id',
  user_id: 'user-id',
  cycle: 1,
  anchor_date: '2025-01-01',
  exec_date: '2025-01-02',
  from_bank_id: 'bank-a',
  to_bank_id: 'bank-b',
  amount: 10,
  status: 'pending',
  created_at: '2025-01-01T00:00:00Z',
  ...overrides,
})

it('computes status counts', () => {
  const result = getTasksSummary([
    makeTask({ status: 'pending' }),
    makeTask({ status: 'completed' }),
    makeTask({ status: 'skipped' }),
  ])

  expect(result.total).toBe(3)
  expect(result.pending).toBe(1)
  expect(result.completed).toBe(1)
  expect(result.skipped).toBe(1)
})

it('returns the latest completion date', () => {
  const result = getTasksSummary([
    makeTask({
      status: 'completed',
      exec_date: '2025-01-10',
      completed_at: '2025-01-10T10:00:00Z',
    }),
    makeTask({
      status: 'completed',
      exec_date: '2025-01-12',
    }),
  ])

  expect(result.lastCompletedAt).toBe('2025-01-12')
})
