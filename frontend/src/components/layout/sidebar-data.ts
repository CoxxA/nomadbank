import {
  Bell,
  Landmark,
  LayoutDashboard,
  ListChecks,
  Palette,
  Settings,
  SlidersHorizontal,
  User,
  Users,
} from 'lucide-react'
import type { SidebarData } from './types'

export const sidebarData: SidebarData = {
  user: {
    name: '用户',
    username: 'user',
    avatar: '',
  },
  teams: [
    {
      name: 'NomadBankKeeper',
      logo: Landmark,
      plan: 'Keep-Alive',
    },
  ],
  navGroups: [
    {
      title: '概览',
      items: [
        {
          title: '仪表盘',
          url: '/',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: '管理',
      items: [
        {
          title: '银行管理',
          url: '/accounts',
          icon: Landmark,
        },
        {
          title: '任务管理',
          url: '/tasks',
          icon: ListChecks,
        },
        {
          title: '策略管理',
          url: '/strategies',
          icon: SlidersHorizontal,
        },
        {
          title: '通知管理',
          url: '/notifications',
          icon: Bell,
        },
      ],
    },
    {
      title: '设置',
      items: [
        {
          title: '设置',
          icon: Settings,
          items: [
            {
              title: '个人资料',
              url: '/settings',
              icon: User,
            },
            {
              title: '外观设置',
              url: '/settings/appearance',
              icon: Palette,
            },
            {
              title: '成员管理',
              url: '/settings/members',
              icon: Users,
            },
          ],
        },
      ],
    },
  ],
}
