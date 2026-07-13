import type { QueryClient } from '@tanstack/react-query'
import {
  Outlet,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router'
import { ApiError } from '@/api/client'
import { AccountsPage } from '@/features/accounts/page'
import { DashboardPage } from '@/features/dashboard/page'
import { LoginPage } from '@/features/session/login-page'
import { meQuery, setupStatusQuery } from '@/features/session/api'
import { SettingsPage } from '@/features/session/settings-page'
import { SetupPage } from '@/features/session/setup-page'
import { StrategiesPage } from '@/features/strategies/page'
import { TasksPage } from '@/features/tasks/page'
import { AppShell } from './app-shell'

interface RouterContext {
  queryClient: QueryClient
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
  notFoundComponent: () => (
    <main className='grid min-h-screen place-items-center bg-[#f4f2ec] p-6 text-center'>
      <div className='max-w-md'>
        <p className='metric-number text-7xl font-semibold text-[#d4ddd7]'>404</p>
        <h1 className='mt-4 text-2xl font-semibold tracking-[-0.03em] text-[#18231f]'>
          这一页不在账本里
        </h1>
        <p className='mt-2 text-sm leading-6 text-[#68736e]'>
          地址可能已经变化，返回概览继续查看账户计划。
        </p>
        <a className='button-primary mt-6' href='/'>
          返回首页
        </a>
      </div>
    </main>
  ),
})

const setupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/setup',
  beforeLoad: async ({ context }) => {
    const status = await context.queryClient.ensureQueryData(setupStatusQuery)
    if (status.initialized) throw redirect({ to: '/login' })
  },
  component: SetupPage,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: async ({ context }) => {
    const status = await context.queryClient.ensureQueryData(setupStatusQuery)
    if (!status.initialized) throw redirect({ to: '/setup' })
    try {
      await context.queryClient.ensureQueryData(meQuery)
      throw redirect({ to: '/' })
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error
    }
  },
  component: LoginPage,
})

const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'authenticated',
  beforeLoad: async ({ context }) => {
    try {
      await context.queryClient.ensureQueryData(meQuery)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        throw redirect({ to: '/login' })
      }
      throw error
    }
  },
  component: AppShell,
})

const dashboardRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/',
  component: DashboardPage,
})

const accountsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/accounts',
  component: AccountsPage,
})

const strategiesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/strategies',
  component: StrategiesPage,
})

const tasksRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/tasks',
  component: TasksPage,
})

const settingsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/settings',
  component: SettingsPage,
})

const routeTree = rootRoute.addChildren([
  setupRoute,
  loginRoute,
  authenticatedRoute.addChildren([
    dashboardRoute,
    accountsRoute,
    strategiesRoute,
    tasksRoute,
    settingsRoute,
  ]),
])

export const router = createRouter({
  routeTree,
  context: { queryClient: undefined! },
  defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
