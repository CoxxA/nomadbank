import { ContentSection } from '../components/content-section'
import { AppearanceForm } from './appearance-form'

export function SettingsAppearance() {
  return (
    <ContentSection
      title='偏好设置'
      desc='自定义应用的外观，支持浅色和深色主题切换'
    >
      <AppearanceForm />
    </ContentSection>
  )
}
