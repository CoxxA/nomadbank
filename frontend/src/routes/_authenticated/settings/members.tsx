import { createFileRoute, redirect } from '@tanstack/react-router'
import { SettingsMembers } from '@/domains/settings/members'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/settings/members')({
  beforeLoad: () => {
    // 检查是否为管理员
    const { auth } = useAuthStore.getState()
    if (!auth.isAdmin()) {
      throw redirect({ to: '/settings' })
    }
  },
  component: SettingsMembers,
})
