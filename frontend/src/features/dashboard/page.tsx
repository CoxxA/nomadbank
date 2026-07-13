import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  ListChecks,
  SlidersHorizontal,
  WalletCards,
} from 'lucide-react'
import type { Task } from '@/api/types'
import { formatDateTime, formatMoney } from '@/lib/format'
import { PageHeader } from '@/ui/page-header'
import { dashboardQuery } from './api'

export const DashboardPage = () => {
  const { data } = useSuspenseQuery(dashboardQuery)
  const nextTask = data.upcoming[0]
  const stats = [
    {
      label: '活跃账户',
      value: `${data.active_accounts}/${data.total_accounts}`,
      icon: WalletCards,
    },
    { label: '待办任务', value: data.pending_tasks, icon: Clock3 },
    { label: '已完成', value: data.completed_tasks, icon: CheckCircle2 },
    { label: '保活策略', value: data.strategies, icon: SlidersHorizontal },
  ]

  return (
    <div className='space-y-8'>
      <PageHeader
        title='今天的账户计划'
        description='把即将执行的账户任务放在一个安静、清楚的地方。NomadBank 只生成计划，不连接银行。'
        actions={
          <Link className='button-primary' to='/tasks'>
            <ListChecks size={17} /> 管理任务
          </Link>
        }
      />

      <section className='relative overflow-hidden rounded-[22px] bg-[#173f33] text-white shadow-[0_18px_50px_rgba(23,63,51,0.14)]'>
        <div className='pointer-events-none absolute -top-24 -right-16 h-72 w-72 rounded-full border border-white/10' />
        <div className='pointer-events-none absolute top-14 -right-6 h-40 w-40 rounded-full border border-[#d6ad6a]/20' />
        <div className='relative grid gap-8 px-6 py-7 sm:px-8 sm:py-8 lg:grid-cols-[1.45fr_0.75fr] lg:items-end'>
          <div>
            <p className='text-xs font-semibold tracking-[0.18em] text-[#a9c9bc] uppercase'>
              下一项待办
            </p>
            {nextTask ? (
              <>
                <div className='mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-xl font-semibold tracking-[-0.025em] sm:text-2xl'>
                  <span>{nextTask.from_account_name}</span>
                  <ArrowRight className='text-[#d6ad6a]' size={20} />
                  <span>{nextTask.to_account_name}</span>
                </div>
                <div className='mt-6 flex flex-wrap items-end gap-x-8 gap-y-4'>
                  <div>
                    <p className='text-xs text-[#a9c9bc]'>计划金额</p>
                    <p className='metric-number mt-1 text-3xl font-semibold text-[#f8f3e8]'>
                      {formatMoney(nextTask.amount_cents)}
                    </p>
                  </div>
                  <div>
                    <p className='text-xs text-[#a9c9bc]'>执行时间</p>
                    <p className='mt-1 text-sm font-medium text-white/90'>
                      {formatDateTime(nextTask.scheduled_at)}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className='mt-5'>
                <h2 className='text-2xl font-semibold tracking-[-0.025em]'>目前没有待执行任务</h2>
                <p className='mt-2 max-w-xl text-sm leading-6 text-[#b9cec5]'>
                  添加至少两个活跃账户并生成任务后，下一项计划会出现在这里。
                </p>
              </div>
            )}
          </div>
          <div className='rounded-2xl border border-white/10 bg-white/[0.055] p-5 backdrop-blur-sm'>
            <p className='text-xs font-medium text-[#a9c9bc]'>账户覆盖</p>
            <div className='mt-3 flex items-baseline gap-2'>
              <span className='metric-number text-4xl font-semibold'>{data.active_accounts}</span>
              <span className='text-sm text-[#a9c9bc]'>个账户参与计划</span>
            </div>
            <div className='mt-4 h-1.5 overflow-hidden rounded-full bg-white/10'>
              <div
                className='h-full rounded-full bg-[#d6ad6a]'
                style={{
                  width: `${data.total_accounts ? Math.round((data.active_accounts / data.total_accounts) * 100) : 0}%`,
                }}
              />
            </div>
            <p className='mt-3 text-xs leading-5 text-[#a9c9bc]'>
              共 {data.total_accounts} 个账户 · {data.pending_tasks} 项待办
            </p>
          </div>
        </div>
      </section>

      <section className='surface grid grid-cols-2 overflow-hidden lg:grid-cols-4'>
        {stats.map(({ label, value, icon: Icon }, index) => (
          <article
            key={label}
            className={`p-5 sm:p-6 ${index % 2 ? 'border-l border-[#e0e4e0]' : ''} ${index >= 2 ? 'border-t border-[#e0e4e0] lg:border-t-0' : ''} ${index > 0 ? 'lg:border-l' : ''}`}
          >
            <div className='flex items-center gap-2 text-[#68736e]'>
              <Icon size={16} />
              <p className='text-xs font-semibold tracking-[0.03em]'>{label}</p>
            </div>
            <p className='metric-number mt-3 text-2xl font-semibold text-[#18231f] sm:text-[1.75rem]'>
              {value}
            </p>
          </article>
        ))}
      </section>

      <div className='grid gap-5 xl:grid-cols-[1.2fr_0.8fr]'>
        <TaskPanel title='接下来' empty='暂无待办任务' tasks={data.upcoming} tone='upcoming' />
        <TaskPanel title='最近完成' empty='还没有完成记录' tasks={data.recent} tone='recent' />
      </div>
    </div>
  )
}

const TaskPanel = ({
  title,
  empty,
  tasks,
  tone,
}: {
  title: string
  empty: string
  tasks: Task[]
  tone: 'upcoming' | 'recent'
}) => (
  <section className='surface overflow-hidden'>
    <header className='flex items-center justify-between border-b border-[#e2e6e2] px-5 py-4.5'>
      <div className='flex items-center gap-2.5'>
        <span
          className={`h-2 w-2 rounded-full ${tone === 'upcoming' ? 'bg-[#bd8740]' : 'bg-[#6d9b86]'}`}
        />
        <h2 className='font-semibold text-[#18231f]'>{title}</h2>
      </div>
      <span className='text-xs text-[#7a857f]'>{tasks.length} 项</span>
    </header>
    {tasks.length === 0 ? (
      <div className='px-5 py-12 text-center'>
        <p className='text-sm font-medium text-[#4c5953]'>{empty}</p>
        <p className='mt-1 text-xs text-[#87908c]'>新的计划会自动显示在这里</p>
      </div>
    ) : (
      <div className='divide-y divide-[#e7e9e6]'>
        {tasks.map((task) => (
          <article key={task.id} className='flex items-center justify-between gap-4 px-5 py-4'>
            <div className='min-w-0'>
              <p className='truncate text-sm font-semibold text-[#25312c]'>
                {task.from_account_name} → {task.to_account_name}
              </p>
              <p className='mt-1 text-xs text-[#748079]'>
                {formatDateTime(task.completed_at ?? task.scheduled_at)}
              </p>
            </div>
            <p className='metric-number shrink-0 text-sm font-semibold text-[#25312c]'>
              {formatMoney(task.amount_cents)}
            </p>
          </article>
        ))}
      </div>
    )}
  </section>
)
