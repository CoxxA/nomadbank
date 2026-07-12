import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { Database, Eye, EyeOff, Landmark, LockKeyhole, LogIn, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { AuthCard } from '@/ui/auth-card'
import { login, meQuery } from './api'

export const LoginPage = () => {
  const navigate = useNavigate()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const mutation = useMutation({
    mutationFn: () => login(username, password),
    onSuccess: async (owner) => {
      queryClient.setQueryData(meQuery.queryKey, owner)
      await router.invalidate()
      await navigate({ to: '/' })
    },
    onError: (error) => toast.error(error.message),
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    mutation.mutate()
  }

  return (
    <AuthCard
      eyebrow='所有者登录'
      storyTitle='把账户保活，收进一份安静的私人清单。'
      storyDescription='没有团队、社交或复杂权限。NomadBank 只在你自己的部署里，安排下一次需要完成的小额操作。'
      title='欢迎回来'
      description='登录你的私人账本，继续查看本期保活任务。'
      trustItems={[
        {
          icon: Database,
          title: '数据留在本地',
          description: '账户、策略和记录保存在本地 SQLite 文件中。',
        },
        {
          icon: Landmark,
          title: '不连接银行',
          description: '不会读取网银；每次完成状态都由你手动记录。',
        },
        {
          icon: UserRound,
          title: '只服务一位所有者',
          description: '每个部署只有一个账户，没有多用户权限负担。',
        },
      ]}
    >
      <form className='space-y-5' onSubmit={submit}>
        <label htmlFor='login-username'>
          <span className='label'>用户名</span>
          <input
            id='login-username'
            className='field border-stone-300 bg-white/70 shadow-none focus:border-[#35715f]'
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder='输入初始化时设置的用户名'
            autoComplete='username'
            required
          />
        </label>
        <div>
          <label htmlFor='login-password' className='label'>
            密码
          </label>
          <div className='relative'>
            <input
              id='login-password'
              className='field border-stone-300 bg-white/70 pr-12 shadow-none focus:border-[#35715f]'
              type={passwordVisible ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete='current-password'
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
        </div>
        <button
          className='button-primary min-h-12 w-full rounded-xl bg-[#285f50] shadow-none hover:bg-[#1f4d41]'
          type='submit'
          disabled={mutation.isPending}
          aria-busy={mutation.isPending}
        >
          <LogIn size={17} strokeWidth={2} aria-hidden='true' />
          {mutation.isPending ? '正在登录…' : '登录'}
        </button>
        <p className='flex items-start gap-2 text-xs leading-5 text-slate-400'>
          <LockKeyhole className='mt-0.5 shrink-0' size={13} aria-hidden='true' />
          登录状态只保存在这个浏览器中，不会同步给第三方服务。
        </p>
      </form>
    </AuthCard>
  )
}
