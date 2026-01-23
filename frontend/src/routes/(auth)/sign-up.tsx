import { createFileRoute } from '@tanstack/react-router'
import { SignUp } from '@/domains/auth/views/sign-up'

export const Route = createFileRoute('/(auth)/sign-up')({
  component: SignUp,
})
