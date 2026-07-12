import { useState, type FormEvent } from 'react'
import type { Account, AccountInput } from '@/api/types'

interface AccountFormProps {
  account?: Account
  pending: boolean
  onSubmit: (input: AccountInput) => void
  onCancel: () => void
}

export const AccountForm = ({ account, pending, onSubmit, onCancel }: AccountFormProps) => {
  const [name, setName] = useState(account?.name ?? '')
  const [groupName, setGroupName] = useState(account?.group_name ?? '')
  const [active, setActive] = useState(account?.active ?? true)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit({ name, group_name: groupName, active })
  }

  return (
    <form className='space-y-5' onSubmit={submit}>
      <label htmlFor='account-name'>
        <span className='label'>账户名称</span>
        <input
          id='account-name'
          className='field'
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder='例如：中国银行'
          maxLength={100}
          autoFocus
          required
        />
      </label>
      <label htmlFor='account-group'>
        <span className='label'>分组（可选）</span>
        <input
          id='account-group'
          className='field'
          value={groupName}
          onChange={(event) => setGroupName(event.target.value)}
          placeholder='例如：国内账户'
          maxLength={50}
        />
      </label>
      <label className='flex items-start gap-3 rounded-xl border border-[#d9dfda] bg-[#f7f7f2] px-4 py-3.5'>
        <input
          type='checkbox'
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
          className='mt-0.5 h-4 w-4'
        />
        <span>
          <span className='block text-sm font-semibold text-[#33413b]'>参与任务生成</span>
          <span className='mt-0.5 block text-xs leading-5 text-[#748079]'>
            停用后不会出现在新任务中，历史记录仍会保留。
          </span>
        </span>
      </label>
      <div className='flex flex-col-reverse gap-2 border-t border-[#e4e7e3] pt-5 sm:flex-row sm:justify-end'>
        <button type='button' className='button-secondary' onClick={onCancel}>
          取消
        </button>
        <button type='submit' className='button-primary' disabled={pending}>
          {pending ? '正在保存…' : '保存账户'}
        </button>
      </div>
    </form>
  )
}
