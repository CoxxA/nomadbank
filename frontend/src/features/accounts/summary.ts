import { getDateKey } from '@/lib/utils'
import type { BankWithNextTask } from '@/lib/types'

type NextTransfer = {
  date: string
  time?: string
  toBank?: string
  amount?: number
}

type AccountsSummary = {
  total: number
  active: number
  inactive: number
  nextTransfer?: NextTransfer
}

const getTransferTimestamp = (bank: BankWithNextTask) => {
  if (!bank.next_exec_date) return null
  const dateKey = getDateKey(bank.next_exec_date)
  if (!dateKey) return null
  const time = bank.next_exec_time ? bank.next_exec_time.slice(0, 8) : '00:00:00'
  const timestamp = new Date(`${dateKey}T${time}`).getTime()
  if (Number.isNaN(timestamp)) return null
  return { timestamp, dateKey }
}

export function getAccountsSummary(banks: BankWithNextTask[]): AccountsSummary {
  const total = banks.length
  const active = banks.filter((bank) => bank.is_active).length
  const inactive = total - active

  const nextTransfer = banks
    .map((bank) => {
      const timeData = getTransferTimestamp(bank)
      if (!timeData) return null
      return {
        ...timeData,
        toBank: bank.next_to_bank_name,
        amount: bank.next_amount,
        time: bank.next_exec_time,
      }
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((a, b) => a.timestamp - b.timestamp)[0]

  return {
    total,
    active,
    inactive,
    nextTransfer: nextTransfer
      ? {
          date: nextTransfer.dateKey,
          time: nextTransfer.time,
          toBank: nextTransfer.toBank,
          amount: nextTransfer.amount,
        }
      : undefined,
  }
}
