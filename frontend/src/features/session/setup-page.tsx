import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { ArrowRight, Clock3, Database, Eye, EyeOff, Landmark, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { passwordValidationMessage } from '@/lib/password'
import { AuthCard } from '@/ui/auth-card'
import { meQuery, sessionKeys, setup } from './api'

export const SetupPage = () => {
  const navigate = useNavigate()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [username, setUsername] = useState('owner')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai'
  )
  const mutation = useMutation({
    mutationFn: setup,
    onSuccess: async (owner) => {
      queryClient.setQueryData(meQuery.queryKey, owner)
      queryClient.setQueryData(sessionKeys.setup, { initialized: true })
      await router.invalidate()
      await navigate({ to: '/' })
      toast.success('初始化完成')
    },
    onError: (error) => toast.error(error.message),
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const passwordError = passwordValidationMessage(password)
    if (passwordError) {
      toast.error(passwordError)
      return
    }
    mutation.mutate({
      username,
      password,
      display_name: displayName,
      timezone,
    })
  }

  return (
    <AuthCard
      eyebrow='首次设置 · 约 1 分钟'
      storyTitle='先安顿好你的私人账本，再开始记录。'
      storyDescription='创建这套实例唯一的所有者账户。之后只需要维护账户标签、保活策略和完成记录。'
      title='创建所有者账户'
      description='填写基本信息即可开始；这里不需要任何网银账号或银行卡凭证。'
      trustItems={[
        {
          icon: Clock3,
          title: '大约 1 分钟',
          description: '只需设置用户名、密码和所在时区。',
        },
        {
          icon: Landmark,
          title: '不连接银行',
          description: '无需授权网银，也不会抓取真实账户数据。',
        },
        {
          icon: Database,
          title: '数据保存在本地',
          description: '所有内容都进入这个部署的 SQLite 文件。',
        },
        {
          icon: UserRound,
          title: '为单用户设计',
          description: '每个部署只有一个所有者，信任边界更清楚。',
        },
      ]}
    >
      <form className='space-y-5' onSubmit={submit}>
        <div className='grid gap-5 sm:grid-cols-2'>
          <label htmlFor='setup-username' className='min-w-0'>
            <span className='label'>用户名</span>
            <input
              id='setup-username'
              className='field border-stone-300 bg-white/70 shadow-none focus:border-[#35715f]'
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              minLength={3}
              maxLength={40}
              autoComplete='username'
              required
            />
          </label>
          <label htmlFor='setup-display-name' className='min-w-0'>
            <span className='label'>显示名称（可选）</span>
            <input
              id='setup-display-name'
              className='field border-stone-300 bg-white/70 shadow-none focus:border-[#35715f]'
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={80}
            />
          </label>
        </div>
        <div>
          <label htmlFor='setup-password' className='label'>
            密码
          </label>
          <div className='relative'>
            <input
              id='setup-password'
              className='field border-stone-300 bg-white/70 pr-12 shadow-none focus:border-[#35715f]'
              type={passwordVisible ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={10}
              maxLength={72}
              autoComplete='new-password'
              required
            />
            <button
              type='button'
              className='icon-button absolute top-1/2 right-1.5 -translate-y-1/2'
              onClick={() => setPasswordVisible((visible) => !visible)}
              aria-label={passwordVisible ? '隐藏密码' : '显示密码'}
            >
              {passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          <span className='mt-1.5 block text-xs leading-5 text-slate-400'>
            至少 10 个字符、UTF-8 编码不超过 72 字节；密码仅以哈希形式保存。
          </span>
        </div>
        <label htmlFor='setup-timezone'>
          <span className='label'>时区</span>
          <input
            id='setup-timezone'
            className='field border-stone-300 bg-white/70 shadow-none focus:border-[#35715f]'
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
            placeholder='Asia/Shanghai'
            required
          />
        </label>
        <button
          className='button-primary min-h-12 w-full rounded-xl bg-[#285f50] shadow-none hover:bg-[#1f4d41]'
          type='submit'
          disabled={mutation.isPending}
          aria-busy={mutation.isPending}
        >
          {mutation.isPending ? '正在初始化…' : '创建并进入 NomadBank'}
          <ArrowRight size={17} strokeWidth={2} aria-hidden='true' />
        </button>
      </form>
    </AuthCard>
  )
}
