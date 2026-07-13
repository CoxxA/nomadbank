import { useState, type FormEvent, type ReactNode } from 'react'
import type { Strategy, StrategyInput } from '@/api/types'
import { minutesToTime, timeToMinutes } from '@/lib/format'

interface StrategyFormProps {
  strategy?: Strategy
  pending: boolean
  onSubmit: (input: StrategyInput) => void
  onCancel: () => void
}

const defaults: StrategyInput = {
  name: '',
  interval_min_days: 30,
  interval_max_days: 60,
  time_start_minutes: 9 * 60,
  time_end_minutes: 21 * 60,
  skip_weekends: false,
  amount_min_cents: 1000,
  amount_max_cents: 3000,
  daily_limit: 3,
}

export const StrategyForm = ({ strategy, pending, onSubmit, onCancel }: StrategyFormProps) => {
  const initial = strategy ?? defaults
  const [name, setName] = useState(initial.name)
  const [intervalMin, setIntervalMin] = useState(initial.interval_min_days)
  const [intervalMax, setIntervalMax] = useState(initial.interval_max_days)
  const [timeStart, setTimeStart] = useState(minutesToTime(initial.time_start_minutes))
  const [timeEnd, setTimeEnd] = useState(minutesToTime(initial.time_end_minutes))
  const [skipWeekends, setSkipWeekends] = useState(initial.skip_weekends)
  const [amountMin, setAmountMin] = useState(initial.amount_min_cents / 100)
  const [amountMax, setAmountMax] = useState(initial.amount_max_cents / 100)
  const [dailyLimit, setDailyLimit] = useState(initial.daily_limit)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit({
      name,
      interval_min_days: intervalMin,
      interval_max_days: intervalMax,
      time_start_minutes: timeToMinutes(timeStart),
      time_end_minutes: timeToMinutes(timeEnd),
      skip_weekends: skipWeekends,
      amount_min_cents: Math.round(amountMin * 100),
      amount_max_cents: Math.round(amountMax * 100),
      daily_limit: dailyLimit,
    })
  }

  return (
    <form className='space-y-5' onSubmit={submit}>
      <label htmlFor='strategy-name'>
        <span className='label'>策略名称</span>
        <input
          id='strategy-name'
          className='field'
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder='例如：日常账户轮换'
          maxLength={100}
          autoFocus
          required
        />
      </label>

      <FieldGroup title='计划间隔' hint='同一方向的任务会在这个天数范围内错开。'>
        <NumberField
          label='最短（天）'
          value={intervalMin}
          min={1}
          max={365}
          onChange={setIntervalMin}
        />
        <NumberField
          label='最长（天）'
          value={intervalMax}
          min={1}
          max={365}
          onChange={setIntervalMax}
        />
      </FieldGroup>

      <FieldGroup title='执行时段' hint='任务会被安排在这个时间窗口内。'>
        <label>
          <span className='label'>开始时间</span>
          <input
            className='field'
            type='time'
            value={timeStart}
            onChange={(event) => setTimeStart(event.target.value)}
            required
          />
        </label>
        <label>
          <span className='label'>结束时间</span>
          <input
            className='field'
            type='time'
            value={timeEnd}
            onChange={(event) => setTimeEnd(event.target.value)}
            required
          />
        </label>
      </FieldGroup>

      <FieldGroup title='金额范围' hint='金额仅用于生成提醒，不会触发任何真实转账。'>
        <NumberField
          label='最低（元）'
          value={amountMin}
          min={0.01}
          max={1000000}
          step={0.01}
          onChange={setAmountMin}
        />
        <NumberField
          label='最高（元）'
          value={amountMax}
          min={0.01}
          max={1000000}
          step={0.01}
          onChange={setAmountMax}
        />
      </FieldGroup>

      <div className='grid gap-4 sm:grid-cols-2 sm:items-end'>
        <NumberField
          label='每日任务上限'
          value={dailyLimit}
          min={1}
          max={100}
          onChange={setDailyLimit}
        />
        <label className='flex min-h-12 items-center gap-3 rounded-[10px] border border-[#d9dfda] bg-[#f7f7f2] px-3.5'>
          <input
            className='h-4 w-4'
            type='checkbox'
            checked={skipWeekends}
            onChange={(event) => setSkipWeekends(event.target.checked)}
          />
          <span className='text-sm font-semibold text-[#3b4842]'>周末不安排任务</span>
        </label>
      </div>

      <div className='flex flex-col-reverse gap-2 border-t border-[#e4e7e3] pt-5 sm:flex-row sm:justify-end'>
        <button type='button' className='button-secondary' onClick={onCancel}>
          取消
        </button>
        <button type='submit' className='button-primary' disabled={pending}>
          {pending ? '正在保存…' : '保存策略'}
        </button>
      </div>
    </form>
  )
}

const FieldGroup = ({
  title,
  hint,
  children,
}: {
  title: string
  hint: string
  children: ReactNode
}) => (
  <fieldset className='rounded-xl border border-[#e0e4e0] bg-[#faf9f5] p-4'>
    <legend className='px-1 text-sm font-semibold text-[#33413b]'>{title}</legend>
    <div className='mt-1 grid gap-3 sm:grid-cols-2'>{children}</div>
    <p className='form-hint'>{hint}</p>
  </fieldset>
)

interface NumberFieldProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
}

const NumberField = ({ label, value, min, max, step = 1, onChange }: NumberFieldProps) => (
  <label>
    <span className='label'>{label}</span>
    <input
      className='field'
      type='number'
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(event) => onChange(event.target.valueAsNumber)}
      required
    />
  </label>
)
