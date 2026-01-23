import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'
import { systemApi } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { Logo } from '@/assets/logo'

const formSchema = z.object({
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码'),
})

export function SignIn() {
  const { redirect } = useSearch({ from: '/(auth)/sign-in' })
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [isFirstUser, setIsFirstUser] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { signIn, signUp } = useAuthStore((state) => state.auth)

  // 检查系统是否已初始化
  useEffect(() => {
    const checkInit = async () => {
      try {
        const status = await systemApi.initialized()
        setIsFirstUser(!status.initialized)
      } catch {
        // 忽略错误
      } finally {
        setChecking(false)
      }
    }
    checkInit()
  }, [])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true)
    try {
      if (isFirstUser) {
        // 首次访问，注册管理员
        await signUp(data.username, data.password)
        toast.success('管理员账户创建成功')
      } else {
        // 登录
        await signIn(data.username, data.password)
      }
      navigate({ to: redirect || '/', replace: true })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '操作失败')
    } finally {
      setIsLoading(false)
    }
  }

  if (checking) {
    return (
      <div className='flex min-h-svh items-center justify-center'>
        <Loader2 className='text-muted-foreground h-8 w-8 animate-spin' />
      </div>
    )
  }

  return (
    <div className='bg-background flex min-h-svh items-center justify-center px-4'>
      <div className='w-full max-w-sm space-y-6'>
        {/* Logo */}
        <div className='flex items-center justify-center gap-2'>
          <Logo className='h-12 w-12' />
          <span className='text-2xl font-semibold'>NomadBank</span>
        </div>

        {/* 标题 */}
        {isFirstUser && (
          <h1 className='text-muted-foreground text-xl font-medium'>
            创建您的账户
          </h1>
        )}

        {/* 表单 */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='username'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>用户名</FormLabel>
                  <FormControl>
                    <Input placeholder='用户名' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='password'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>密码</FormLabel>
                  <FormControl>
                    <PasswordInput placeholder='密码' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button className='w-full' disabled={isLoading}>
              {isLoading && <Loader2 className='h-4 w-4 animate-spin' />}
              {isFirstUser ? '注册' : '登录'}
            </Button>
          </form>
        </Form>

        {/* 底部链接 */}
        <div className='text-muted-foreground text-center text-sm'>
          {isFirstUser ? (
            <span>您正在注册为站点管理员。</span>
          ) : (
            <>
              还没有账户？{' '}
              <Link to='/sign-up' className='text-primary hover:underline'>
                注册
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
