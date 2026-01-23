import { Outlet } from '@tanstack/react-router'
import { Palette, User, Users } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Main } from '@/components/layout/main'
import { useAuthStore } from '@/stores/auth-store'
import { SidebarNav } from './components/sidebar-nav'

export function Settings() {
  const { auth } = useAuthStore()
  const isAdmin = auth.isAdmin()

  // 基础分组 - 所有用户可见
  const basicGroup = {
    title: '基础',
    items: [
      {
        title: '我的账号',
        href: '/settings',
        icon: <User size={18} />,
      },
      {
        title: '偏好设置',
        href: '/settings/appearance',
        icon: <Palette size={18} />,
      },
    ],
  }

  // 管理分组 - 仅管理员可见
  const adminGroup = {
    title: '管理',
    items: [
      {
        title: '成员',
        href: '/settings/members',
        icon: <Users size={18} />,
      },
    ],
  }

  // 根据权限构建导航分组
  const navGroups = isAdmin ? [basicGroup, adminGroup] : [basicGroup]

  return (
    <Main fixed>
      <div className='space-y-0.5'>
        <h1 className='text-2xl font-bold tracking-tight md:text-3xl'>设置</h1>
        <p className='text-muted-foreground'>管理你的账号和系统设置</p>
      </div>
      <Separator className='my-4 lg:my-6' />
      <div className='flex flex-1 flex-col space-y-4 overflow-hidden lg:flex-row lg:gap-8 lg:space-y-0'>
        <aside className='shrink-0 lg:w-48'>
          <SidebarNav groups={navGroups} />
        </aside>
        <div className='flex-1 overflow-y-auto'>
          <Outlet />
        </div>
      </div>
    </Main>
  )
}
