import { Suspense } from 'react'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { Link, Outlet, useNavigate, useRouter } from '@tanstack/react-router'
import {
  CircleUserRound,
  Landmark,
  LayoutDashboard,
  ListChecks,
  LogOut,
  SlidersHorizontal,
  WalletCards,
} from 'lucide-react'
import { toast } from 'sonner'
import { logout, meQuery } from '@/features/session/api'

const navigation = [
  { to: '/', label: '概览', icon: LayoutDashboard },
  { to: '/accounts', label: '账户', icon: WalletCards },
  { to: '/strategies', label: '策略', icon: SlidersHorizontal },
  { to: '/tasks', label: '任务', icon: ListChecks },
] as const

export const AppShell = () => {
  const { data: owner } = useSuspenseQuery(meQuery)
  const queryClient = useQueryClient()
  const router = useRouter()
  const navigate = useNavigate()
  const ownerName = owner.display_name || owner.username
  const ownerInitial = ownerName.trim().charAt(0).toUpperCase() || 'N'
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      queryClient.clear()
      await router.invalidate()
      await navigate({ to: '/login' })
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <div className='min-h-screen bg-[#f6f4ed] text-[#202820] lg:grid lg:grid-cols-[264px_minmax(0,1fr)]'>
      <a
        href='#main-content'
        className='sr-only z-50 rounded-md bg-[#173f33] px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3'
      >
        跳到主要内容
      </a>
      <aside className='sticky top-0 hidden h-screen flex-col border-r border-[#ded9ca] bg-[#fbfaf5] lg:flex'>
        <div className='px-7 pt-8 pb-9'>
          <Link to='/' className='group flex items-center gap-3' aria-label='NomadBank 首页'>
            <span className='flex h-11 w-11 items-center justify-center bg-[#183f35] text-[#f7f4e9] shadow-[0_5px_16px_rgb(24_63_53_/_16%)] transition-transform group-hover:-translate-y-0.5'>
              <Landmark size={21} strokeWidth={1.8} />
            </span>
            <span className='min-w-0'>
              <span className='block text-[17px] font-bold tracking-[-0.02em] text-[#173c33]'>
                NomadBank
              </span>
              <span className='mt-0.5 block text-[11px] font-semibold tracking-[0.16em] text-[#879087] uppercase'>
                Personal ledger
              </span>
            </span>
          </Link>
        </div>

        <div className='mx-7 border-t border-[#e4dfd2]' />

        <nav className='flex-1 px-4 pt-7' aria-label='主导航'>
          <p className='mb-3 px-4 text-[11px] font-semibold tracking-[0.18em] text-[#95978e] uppercase'>
            我的账本
          </p>
          <div className='space-y-1.5'>
            {navigation.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === '/' }}
                className='flex min-h-11 w-full items-center gap-3 border-l-[3px] border-transparent px-4 text-sm font-medium text-[#5d685f] transition-colors hover:bg-[#f0eee5] hover:text-[#183f35]'
                activeProps={{
                  className:
                    'border-[#245c4c] bg-[#e6efe8] font-semibold text-[#173c33] hover:bg-[#e6efe8]',
                }}
              >
                <Icon size={18} strokeWidth={1.8} aria-hidden='true' />
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </nav>

        <div className='border-t border-[#ded9ca] p-4'>
          <Link
            to='/settings'
            className='mb-2 flex min-w-0 items-center gap-3 px-3 py-3 transition-colors hover:bg-[#f0eee5]'
            activeProps={{ className: 'bg-[#e6efe8]' }}
          >
            <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#d9e8de] text-sm font-bold text-[#1d4b3f]'>
              {ownerInitial}
            </span>
            <span className='min-w-0 flex-1'>
              <span className='block truncate text-sm font-semibold text-[#28382f]'>
                {ownerName}
              </span>
              <span className='block truncate text-xs text-[#7f887f]'>@{owner.username}</span>
            </span>
            <CircleUserRound size={17} className='shrink-0 text-[#738078]' aria-hidden='true' />
            <span className='sr-only'>打开设置</span>
          </Link>
          <button
            type='button'
            className='flex min-h-10 w-full items-center gap-3 px-3 text-sm font-medium text-[#667168] transition-colors hover:bg-[#f4e9e5] hover:text-[#8a3f32] disabled:cursor-wait disabled:opacity-50'
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            <LogOut size={17} strokeWidth={1.8} aria-hidden='true' />
            {logoutMutation.isPending ? '正在退出…' : '退出登录'}
          </button>
        </div>
      </aside>

      <header className='sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[#ded9ca] bg-[#fbfaf5]/95 px-4 backdrop-blur lg:hidden'>
        <Link to='/' className='flex items-center gap-2.5' aria-label='NomadBank 首页'>
          <span className='flex h-9 w-9 items-center justify-center bg-[#183f35] text-[#f7f4e9]'>
            <Landmark size={18} strokeWidth={1.8} aria-hidden='true' />
          </span>
          <span className='font-bold tracking-[-0.02em] text-[#173c33]'>NomadBank</span>
        </Link>
        <div className='flex items-center gap-1'>
          <Link
            to='/settings'
            className='flex min-h-10 items-center gap-2 px-2.5 text-sm font-semibold text-[#405047] transition-colors hover:bg-[#eeeae0]'
            activeProps={{ className: 'bg-[#e6efe8] text-[#173c33]' }}
            aria-label='打开设置'
          >
            <CircleUserRound size={18} strokeWidth={1.8} aria-hidden='true' />
            <span>设置</span>
          </Link>
          <button
            type='button'
            className='flex h-10 w-10 items-center justify-center text-[#667168] transition-colors hover:bg-[#f4e9e5] hover:text-[#8a3f32] disabled:cursor-wait disabled:opacity-50'
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            aria-label={logoutMutation.isPending ? '正在退出' : '退出登录'}
            title='退出登录'
          >
            <LogOut size={18} strokeWidth={1.8} aria-hidden='true' />
          </button>
        </div>
      </header>

      <main id='main-content' className='min-w-0 pb-24 lg:pb-0'>
        <div className='mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10'>
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </div>
      </main>

      <nav
        className='fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-[#d8d3c5] bg-[#fbfaf5]/95 px-2 pt-1.5 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] shadow-[0_-8px_24px_rgb(39_55_45_/_8%)] backdrop-blur lg:hidden'
        aria-label='移动端主导航'
      >
        {navigation.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === '/' }}
            className='flex min-h-14 flex-col items-center justify-center gap-1 border-t-2 border-transparent text-[11px] font-medium text-[#758078] transition-colors hover:text-[#1d4b3f]'
            activeProps={{
              className: 'border-[#245c4c] bg-[#eaf1eb] font-semibold text-[#173c33]',
            }}
          >
            <Icon size={20} strokeWidth={1.8} aria-hidden='true' />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}

const PageLoading = () => (
  <div className='animate-pulse space-y-8' aria-label='正在加载页面'>
    <div className='space-y-3'>
      <div className='h-8 w-48 rounded-lg bg-[#dde2dc]' />
      <div className='h-4 w-full max-w-xl rounded bg-[#e5e7e2]' />
    </div>
    <div className='h-64 rounded-[22px] bg-[#e2e5df]' />
    <div className='grid gap-4 sm:grid-cols-2'>
      <div className='h-44 rounded-2xl bg-[#e5e7e2]' />
      <div className='h-44 rounded-2xl bg-[#e5e7e2]' />
    </div>
  </div>
)
