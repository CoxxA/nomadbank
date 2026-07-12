import { useMemo, useState, type FormEvent } from 'react'
import type { Account, GenerateBatchInput, Strategy } from '@/api/types'

interface GenerateFormProps {
  accounts: Account[]
  strategies: Strategy[]
  pending: boolean
  onSubmit: (input: GenerateBatchInput) => void
  onCancel: () => void
}

export const GenerateForm = ({
  accounts,
  strategies,
  pending,
  onSubmit,
  onCancel,
}: GenerateFormProps) => {
  const groups = useMemo(
    () => [
      ...new Set(
        accounts
          .filter((account) => account.active && account.group_name)
          .map((account) => account.group_name)
      ),
    ],
    [accounts]
  )
  const [strategyID, setStrategyID] = useState(strategies[0]?.id ?? 0)
  const [groupName, setGroupName] = useState('')
  const [cycles, setCycles] = useState(4)
  const availableAccounts = accounts.filter(
    (account) => account.active && (!groupName || account.group_name === groupName)
  ).length

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit({ strategy_id: strategyID, group_name: groupName, cycles })
  }

  return (
    <form className='space-y-5' onSubmit={submit}>
      <label htmlFor='task-strategy'>
        <span className='label'>保活策略</span>
        <select
          id='task-strategy'
          className='field'
          value={strategyID}
          onChange={(event) => setStrategyID(Number(event.target.value))}
          required
        >
          {strategies.map((strategy) => (
            <option key={strategy.id} value={strategy.id}>
              {strategy.name}
            </option>
          ))}
        </select>
        {strategies.length === 0 ? (
          <span className='form-hint text-[#a95757]'>请先创建一个保活策略。</span>
        ) : null}
      </label>
      <label htmlFor='task-group'>
        <span className='label'>账户分组</span>
        <select
          id='task-group'
          className='field'
          value={groupName}
          onChange={(event) => setGroupName(event.target.value)}
        >
          <option value=''>全部活跃账户</option>
          {groups.map((group) => (
            <option key={group} value={group}>
              {group}
            </option>
          ))}
        </select>
        <span className='form-hint'>
          当前范围有 <strong className='font-semibold text-[#33413b]'>{availableAccounts}</strong>{' '}
          个活跃账户
        </span>
      </label>
      <label htmlFor='task-cycles'>
        <span className='label'>生成周期</span>
        <input
          id='task-cycles'
          className='field'
          type='number'
          min={1}
          max={24}
          value={cycles}
          onChange={(event) => setCycles(event.target.valueAsNumber)}
          required
        />
      </label>
      {availableAccounts < 2 ? (
        <p className='rounded-xl border border-[#ead8b7] bg-[#f8f0e2] px-4 py-3 text-sm leading-6 text-[#7c5b2b]'>
          当前范围至少需要两个活跃账户才能形成转入与转出的闭环。
        </p>
      ) : null}
      <div className='flex flex-col-reverse gap-2 border-t border-[#e4e7e3] pt-5 sm:flex-row sm:justify-end'>
        <button type='button' className='button-secondary' onClick={onCancel}>
          取消
        </button>
        <button
          type='submit'
          className='button-primary'
          disabled={pending || strategyID === 0 || availableAccounts < 2}
        >
          {pending ? '正在生成…' : '生成任务'}
        </button>
      </div>
    </form>
  )
}
