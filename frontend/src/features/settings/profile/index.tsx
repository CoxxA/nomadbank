import { ContentSection } from '../components/content-section'
import { ProfileForm } from './profile-form'

export function SettingsProfile() {
  return (
    <ContentSection title='账号信息' desc='设置你的头像和昵称'>
      <ProfileForm />
    </ContentSection>
  )
}
