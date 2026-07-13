import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { KeyRound, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { passwordValidationMessage } from '@/lib/password'
import { PageHeader } from '@/ui/page-header'
import { changePassword, meQuery, updateOwner } from './api'

export const SettingsPage = () => {
  const { data: owner } = useSuspenseQuery(meQuery)
  const queryClient = useQueryClient()
  const [displayName, setDisplayName] = useState(owner.display_name)
  const [timezone, setTimezone] = useState(owner.timezone)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const ownerMutation = useMutation({
    mutationFn: () => updateOwner(displayName, timezone),
    onSuccess: (updated) => {
      queryClient.setQueryData(meQuery.queryKey, updated)
      toast.success('设置已保存')
    },
    onError: (error) => toast.error(error.message),
  })
  const passwordMutation = useMutation({
    mutationFn: () => changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setCurrentPassword('')
      setNewPassword('')
      toast.success('密码已更新，其他会话已退出')
    },
    onError: (error) => toast.error(error.message),
  })

  const saveOwner = (event: FormEvent) => {
    event.preventDefault()
    ownerMutation.mutate()
  }
  const savePassword = (event: FormEvent) => {
    event.preventDefault()
    const passwordError = passwordValidationMessage(newPassword)
    if (passwordError) {
      toast.error(passwordError)
      return
    }
    passwordMutation.mutate()
  }

  return (
    <div className='space-y-8'>
      <PageHeader
        title='所有者设置'
        description='管理显示名称、任务排期时区与登录密码。设置只保存在当前实例。'
      />

      <div className='grid gap-5 xl:grid-cols-2'>
        <form className='surface overflow-hidden' onSubmit={saveOwner}>
          <header className='flex items-center gap-3 border-b border-[#e2e6e2] bg-[#faf9f5] px-5 py-4'>
            <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-[#e4f0ea] text-[#216a55]'>
              <UserRound size={19} />
            </div>
            <div>
              <h2 className='font-semibold text-[#25312c]'>个人偏好</h2>
              <p className='mt-0.5 text-xs text-[#748079]'>登录用户名：{owner.username}</p>
            </div>
          </header>
          <div className='space-y-5 p-5 sm:p-6'>
            <label htmlFor='owner-display-name'>
              <span className='label'>显示名称</span>
              <input
                id='owner-display-name'
                className='field'
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder='在导航中显示的名称'
                maxLength={80}
              />
            </label>
            <label htmlFor='owner-timezone'>
              <span className='label'>IANA 时区</span>
              <input
                id='owner-timezone'
                className='field'
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                placeholder='Asia/Shanghai'
                required
              />
              <span className='form-hint'>任务日期与执行时段都按这个时区计算。</span>
            </label>
            <div className='border-t border-[#e4e7e3] pt-5'>
              <button className='button-primary' disabled={ownerMutation.isPending}>
                {ownerMutation.isPending ? '正在保存…' : '保存设置'}
              </button>
            </div>
          </div>
        </form>

        <form className='surface overflow-hidden' onSubmit={savePassword}>
          <header className='flex items-center gap-3 border-b border-[#e2e6e2] bg-[#faf9f5] px-5 py-4'>
            <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5ecdc] text-[#8b642d]'>
              <KeyRound size={19} />
            </div>
            <div>
              <h2 className='font-semibold text-[#25312c]'>登录安全</h2>
              <p className='mt-0.5 text-xs text-[#748079]'>修改密码会撤销其他浏览器中的会话</p>
            </div>
          </header>
          <div className='space-y-5 p-5 sm:p-6'>
            <label htmlFor='current-password'>
              <span className='label'>当前密码</span>
              <input
                id='current-password'
                className='field'
                type='password'
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete='current-password'
                required
              />
            </label>
            <label htmlFor='new-password'>
              <span className='label'>新密码</span>
              <input
                id='new-password'
                className='field'
                type='password'
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={10}
                maxLength={72}
                autoComplete='new-password'
                required
              />
              <span className='form-hint'>至少 10 个字符，UTF-8 编码后不超过 72 字节。</span>
            </label>
            <div className='border-t border-[#e4e7e3] pt-5'>
              <button className='button-primary' disabled={passwordMutation.isPending}>
                {passwordMutation.isPending ? '正在更新…' : '更新密码'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
