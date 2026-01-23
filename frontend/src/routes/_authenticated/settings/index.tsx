import { createFileRoute } from '@tanstack/react-router'
import { SettingsProfile } from '@/domains/settings/profile'

export const Route = createFileRoute('/_authenticated/settings/')({
  component: SettingsProfile,
})
