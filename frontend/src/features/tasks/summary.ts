import type { Task } from '@/lib/types'

type TasksSummary = {
  total: number
  pending: number
  completed: number
  skipped: number
  lastCompletedAt?: string
}

const getCompletedTimestamp = (task: Task) => {
  if (task.status !== 'completed') return null
  const dateValue = task.completed_at || task.exec_date
  if (!dateValue) return null
  const timestamp = new Date(dateValue).getTime()
  if (Number.isNaN(timestamp)) return null
  return { timestamp, dateValue }
}

export function getTasksSummary(tasks: Task[]): TasksSummary {
  const total = tasks.length
  const pending = tasks.filter((task) => task.status === 'pending').length
  const completed = tasks.filter((task) => task.status === 'completed').length
  const skipped = tasks.filter((task) => task.status === 'skipped').length

  const lastCompletedAt = tasks
    .map(getCompletedTimestamp)
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((a, b) => b.timestamp - a.timestamp)[0]?.dateValue

  return {
    total,
    pending,
    completed,
    skipped,
    lastCompletedAt,
  }
}
