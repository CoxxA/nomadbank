import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { SignIn } from '@/domains/auth/views/sign-in'

const searchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/(auth)/sign-in')({
  component: SignIn,
  validateSearch: searchSchema,
})
