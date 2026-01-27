import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, User } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { profileApi } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

const profileFormSchema = z.object({
  nickname: z.string().min(1, '昵称不能为空').max(50, '昵称不能超过 50 个字符'),
  avatar: z.string().optional(),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

export function ProfileForm() {
  const { auth } = useAuthStore()
  const [saving, setSaving] = useState(false)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      nickname: auth.user?.nickname || '',
      avatar: auth.user?.avatar || '',
    },
  })

  const avatarValue = form.watch('avatar')

  const onSubmit = async (data: ProfileFormValues) => {
    setSaving(true)
    try {
      const updatedUser = await profileApi.updateProfile({
        nickname: data.nickname,
        avatar: data.avatar,
      })
      auth.setUser({
        ...auth.user!,
        nickname: updatedUser.nickname,
        avatar: updatedUser.avatar,
      })
      toast.success('个人资料已更新')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='space-y-6'>
      {/* 用户信息 */}
      <div className='flex items-center gap-4'>
        <Avatar className='h-16 w-16'>
          <AvatarImage src={avatarValue} alt={auth.user?.nickname} />
          <AvatarFallback>
            <User className='h-8 w-8' />
          </AvatarFallback>
        </Avatar>
        <div>
          <p className='font-medium'>
            {auth.user?.nickname || auth.user?.username}
          </p>
          <p className='text-muted-foreground text-sm'>
            @{auth.user?.username}
          </p>
          <p className='text-muted-foreground text-xs'>
            {auth.user?.role === 'admin' ? '管理员' : '普通用户'}
          </p>
        </div>
      </div>

      <Separator />

      {/* 编辑表单 */}
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className='max-w-lg space-y-4'
        >
          <FormField
            control={form.control}
            name='nickname'
            render={({ field }) => (
              <FormItem>
                <FormLabel>昵称</FormLabel>
                <FormControl>
                  <Input placeholder='输入你的昵称' {...field} />
                </FormControl>
                <FormDescription>显示在界面上的名称</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='avatar'
            render={({ field }) => (
              <FormItem>
                <FormLabel>头像 URL</FormLabel>
                <FormControl>
                  <Input
                    placeholder='https://example.com/avatar.png'
                    {...field}
                  />
                </FormControl>
                <FormDescription>输入头像图片的 URL 地址</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type='submit' disabled={saving}>
            {saving && <Loader2 className='h-4 w-4 animate-spin' />}
            保存
          </Button>
        </form>
      </Form>
    </div>
  )
}
