/**
 * 仪表盘页面
 */
import { useCallback, useMemo, useState } from 'react'
import {
  ArrowRight,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  FastForward,
  Landmark,
  Loader2,
  TrendingUp,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { toast } from 'sonner'
import { CalendarView } from '@/components/calendar-view'
import { Main } from '@/components/layout/main'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useCalendarData,
  useDashboardStats,
  useNextDayTasks,
  useRecentActivities,
  useRefreshQueries,
  useTodayTasks,
  useTasks,
} from '@/hooks/use-queries'
import { notificationsApi, tasksApi } from '@/lib/api'
import { cn } from '@/lib/utils'

const RANGE_LABELS = {
  week: '本周',
  month: '本月',
  year: '本年',
} as const

const ACTIVITY_STATUS = {
  completed: { label: '已完成', dot: 'bg-emerald-400', badge: 'default' },
  skipped: { label: '已跳过', dot: 'bg-slate-400', badge: 'secondary' },
  pending: { label: '待处理', dot: 'bg-amber-400', badge: 'outline' },
} as const

type RangeKey = keyof typeof RANGE_LABELS

const pad = (value: number) => String(value).padStart(2, '0')

const formatDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

const parseDate = (value: string) => new Date(`${value}T00:00:00`)

const getWeekRange = (baseDate: Date) => {
  const normalized = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate()
  )
  const day = normalized.getDay()
  const offset = day === 0 ? -6 : 1 - day
  const start = new Date(normalized)
  start.setDate(normalized.getDate() + offset)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return { start, end }
}

const getMonthRange = (year: number, month: number) => {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  return { start, end }
}

const getYearRange = (year: number) => {
  const start = new Date(year, 0, 1)
  const end = new Date(year, 11, 31)
  return { start, end }
}

const formatMetric = (value?: number | null) =>
  value === null || value === undefined ? '--' : value.toLocaleString()

export function Dashboard() {
  const [sendingReminder, setSendingReminder] = useState(false)
  const [completingAll, setCompletingAll] = useState(false)
  const [postponing, setPostponing] = useState(false)
  const [range, setRange] = useState<RangeKey>('month')
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  const { calendarStartDate, calendarEndDate } = useMemo(() => {
    const { year, month } = calendarMonth
    const lastDay = new Date(year, month + 1, 0).getDate()
    return {
      calendarStartDate: `${year}-${pad(month + 1)}-01`,
      calendarEndDate: `${year}-${pad(month + 1)}-${lastDay}`,
    }
  }, [calendarMonth])

  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: tasks = [], isLoading: tasksLoading } = useTasks()
  const { data: recentActivities = [] } = useRecentActivities(8)
  const { data: nextDayTasks } = useNextDayTasks()
  const { data: todayTasks } = useTodayTasks()
  const { data: calendarData = [] } = useCalendarData(
    calendarStartDate,
    calendarEndDate
  )
  const { refreshTasks } = useRefreshQueries()

  const rangeMeta = useMemo(() => {
    if (range === 'week') {
      const { start, end } = getWeekRange(new Date())
      return { start, end, label: '本周' }
    }
    if (range === 'month') {
      const { start, end } = getMonthRange(calendarMonth.year, calendarMonth.month)
      return {
        start,
        end,
        label: `${calendarMonth.year}-${pad(calendarMonth.month + 1)}`,
      }
    }
    const { start, end } = getYearRange(calendarMonth.year)
    return { start, end, label: `${calendarMonth.year}` }
  }, [range, calendarMonth])

  const tasksInRange = useMemo(() => {
    if (tasksLoading) return []
    return tasks.filter((task) => {
      const date = parseDate(task.exec_date)
      return date >= rangeMeta.start && date <= rangeMeta.end
    })
  }, [tasks, tasksLoading, rangeMeta])

  const rangeSummary = useMemo(() => {
    if (!tasksLoading) {
      const total = tasksInRange.length
      const completed = tasksInRange.filter(
        (task) => task.status === 'completed'
      ).length
      const pending = tasksInRange.filter(
        (task) => task.status === 'pending'
      ).length
      const skipped = tasksInRange.filter(
        (task) => task.status === 'skipped'
      ).length
      return { total, completed, pending, skipped }
    }
    if (range === 'month') {
      return {
        total: stats?.total_tasks_month,
        completed: stats?.completed_tasks_month,
        pending: stats?.pending_tasks,
        skipped: undefined,
      }
    }
    if (range === 'year') {
      return {
        total: stats?.total_tasks_year,
        completed: stats?.completed_tasks_year,
        pending: stats?.pending_tasks,
        skipped: undefined,
      }
    }
    return { total: undefined, completed: undefined, pending: undefined, skipped: undefined }
  }, [tasksLoading, tasksInRange, range, stats])

  const completionRate = useMemo(() => {
    if (rangeSummary.total === null || rangeSummary.total === undefined) return null
    if (rangeSummary.total === 0) return 0
    return Math.round(((rangeSummary.completed || 0) / rangeSummary.total) * 100)
  }, [rangeSummary])

  const chartData = useMemo(() => {
    if (tasksLoading) return []
    if (range === 'year') {
      const counts = new Array(12).fill(0)
      tasks.forEach((task) => {
        const date = parseDate(task.exec_date)
        if (date.getFullYear() === calendarMonth.year) {
          counts[date.getMonth()] += 1
        }
      })
      return counts.map((count, index) => ({
        label: `${index + 1}月`,
        count,
      }))
    }

    const days =
      Math.round(
        (rangeMeta.end.getTime() - rangeMeta.start.getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1
    const countsMap: Record<string, number> = {}
    tasks.forEach((task) => {
      const date = parseDate(task.exec_date)
      if (date >= rangeMeta.start && date <= rangeMeta.end) {
        const key = formatDate(date)
        countsMap[key] = (countsMap[key] || 0) + 1
      }
    })
    return Array.from({ length: days }, (_, index) => {
      const date = new Date(rangeMeta.start)
      date.setDate(rangeMeta.start.getDate() + index)
      const key = formatDate(date)
      return {
        label: range === 'week' ? `${pad(date.getMonth() + 1)}-${pad(date.getDate())}` : `${date.getDate()}`,
        date: key,
        count: countsMap[key] || 0,
      }
    })
  }, [tasks, tasksLoading, range, rangeMeta, calendarMonth.year])

  const chartSummary = useMemo(() => {
    if (chartData.length === 0) return null
    const total = chartData.reduce((sum, item) => sum + item.count, 0)
    const average = total / chartData.length
    const peak = chartData.reduce(
      (prev, current) => (current.count > prev.count ? current : prev),
      chartData[0]
    )
    return {
      total,
      average: Math.round(average * 10) / 10,
      peak,
    }
  }, [chartData])

  const loading = statsLoading && tasksLoading

  const handleMonthChange = useCallback((startDate: string) => {
    const [year, month] = startDate.split('-').map(Number)
    setCalendarMonth({ year, month: month - 1 })
  }, [])

  const handleSendReminder = async () => {
    setSendingReminder(true)
    try {
      const result = await notificationsApi.sendDailyReminder()
      if (result.notified) {
        toast.success(result.message)
      } else {
        toast.info(result.message)
      }
    } catch {
      toast.error('发送提醒失败')
    } finally {
      setSendingReminder(false)
    }
  }

  const handleCompleteAll = async () => {
    if (!todayTasks || todayTasks.pending_count === 0) {
      toast.info('今日没有待处理任务')
      return
    }
    setCompletingAll(true)
    try {
      const result = await tasksApi.batchCompleteToday()
      toast.success(result.message)
      refreshTasks()
    } catch {
      toast.error('操作失败')
    } finally {
      setCompletingAll(false)
    }
  }

  const handlePostponeToday = async () => {
    if (!todayTasks || todayTasks.pending_count === 0) {
      toast.info('今日没有待处理任务')
      return
    }
    setPostponing(true)
    try {
      const result = await tasksApi.batchPostpone({
        postpone_today: true,
        days: 1,
      })
      toast.success(result.message)
      refreshTasks()
    } catch {
      toast.error('操作失败')
    } finally {
      setPostponing(false)
    }
  }

  const glassCard =
    'border border-white/10 bg-white/70 shadow-sm backdrop-blur-md dark:bg-slate-900/60 dark:border-white/10'

  if (loading) {
    return (
      <Main className='space-y-6'>
        <div className='space-y-2'>
          <div className='bg-muted/60 h-7 w-32 animate-pulse rounded' />
          <div className='bg-muted/40 h-4 w-52 animate-pulse rounded' />
        </div>
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
          {[...Array(4)].map((_, i) => (
            <Card key={i} className={glassCard}>
              <CardHeader className='animate-pulse space-y-2'>
                <div className='bg-muted/50 h-4 w-24 rounded' />
                <div className='bg-muted/40 h-8 w-16 rounded' />
              </CardHeader>
            </Card>
          ))}
        </div>
        <div className='grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'>
          <Card className={cn(glassCard, 'min-h-[320px]')} />
          <Card className={cn(glassCard, 'min-h-[320px]')} />
        </div>
      </Main>
    )
  }

  return (
    <Main className='space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>仪表盘</h1>
          <p className='text-muted-foreground text-sm'>任务执行与活跃概览</p>
        </div>
        <Tabs value={range} onValueChange={(value) => setRange(value as RangeKey)}>
          <TabsList className='border border-white/10 bg-white/70 dark:border-white/10 dark:bg-slate-900/60'>
            {Object.entries(RANGE_LABELS).map(([key, label]) => (
              <TabsTrigger key={key} value={key} className='text-xs'>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className='grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'>
        <div className='space-y-4'>
          <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
            <Card className={glassCard}>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-muted-foreground text-sm font-medium'>
                  完成率
                </CardTitle>
                <TrendingUp className='text-muted-foreground h-4 w-4' />
              </CardHeader>
              <CardContent className='space-y-1'>
                <div className='flex items-end gap-2'>
                  <span className='font-fira-code text-3xl font-semibold leading-none'>
                    {completionRate === null ? '--' : `${completionRate}%`}
                  </span>
                  <span className='text-muted-foreground text-xs'>
                    {formatMetric(rangeSummary.completed)} / {formatMetric(rangeSummary.total)}
                  </span>
                </div>
                <p className='text-muted-foreground text-xs'>完成 / 总量 · {rangeMeta.label}</p>
              </CardContent>
            </Card>

            <Card className={glassCard}>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-muted-foreground text-sm font-medium'>
                  待处理任务
                </CardTitle>
                <Clock className='text-muted-foreground h-4 w-4' />
              </CardHeader>
              <CardContent className='space-y-1'>
                <div className='font-fira-code text-3xl font-semibold leading-none'>
                  {formatMetric(rangeSummary.pending)}
                </div>
                <p className='text-muted-foreground text-xs'>等待执行 · {rangeMeta.label}</p>
              </CardContent>
            </Card>

            <Card className={glassCard}>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-muted-foreground text-sm font-medium'>
                  已跳过任务
                </CardTitle>
                <FastForward className='text-muted-foreground h-4 w-4' />
              </CardHeader>
              <CardContent className='space-y-1'>
                <div className='font-fira-code text-3xl font-semibold leading-none'>
                  {formatMetric(rangeSummary.skipped)}
                </div>
                <p className='text-muted-foreground text-xs'>无需执行 · {rangeMeta.label}</p>
              </CardContent>
            </Card>

            <Card className={glassCard}>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-muted-foreground text-sm font-medium'>
                  银行数量
                </CardTitle>
                <Landmark className='text-muted-foreground h-4 w-4' />
              </CardHeader>
              <CardContent className='space-y-1'>
                <div className='font-fira-code text-3xl font-semibold leading-none'>
                  {formatMetric(stats?.banks_count ?? stats?.total_banks)}
                </div>
                <p className='text-muted-foreground text-xs'>已接入账户</p>
              </CardContent>
            </Card>
          </div>

          <Card className={cn(glassCard, 'overflow-hidden')}>
            <CardHeader className='space-y-2 pb-2'>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <CardTitle className='text-base'>
                    {range === 'month'
                      ? '本月每日任务量'
                      : range === 'week'
                        ? '本周任务量'
                        : '本年任务量'}
                  </CardTitle>
                  <p className='text-muted-foreground text-xs'>
                    数据区间：{rangeMeta.label}
                  </p>
                </div>
                {nextDayTasks ? (
                  <div className='text-muted-foreground flex items-center gap-1 text-xs'>
                    <Clock className='h-3.5 w-3.5' />
                    <span>
                      下次执行 {nextDayTasks.days_until} 天后 · {nextDayTasks.date}
                    </span>
                  </div>
                ) : null}
              </div>
              {chartSummary ? (
                <div className='text-muted-foreground flex flex-wrap gap-4 text-xs'>
                  <span>
                    峰值：{chartSummary.peak.label}（{chartSummary.peak.count}）
                  </span>
                  <span>平均：{chartSummary.average}</span>
                  <span>总量：{chartSummary.total}</span>
                </div>
              ) : null}
            </CardHeader>
            <CardContent className='h-[260px] pt-2'>
              {chartData.length === 0 ? (
                <div className='text-muted-foreground flex h-full items-center justify-center text-sm'>
                  暂无任务数据
                </div>
              ) : (
                <ResponsiveContainer width='100%' height='100%'>
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray='4 4' stroke='rgba(148, 163, 184, 0.2)' />
                    <XAxis
                      dataKey='label'
                      tick={{ fontSize: 10 }}
                      tickMargin={6}
                      minTickGap={8}
                      stroke='rgba(148, 163, 184, 0.6)'
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 10 }}
                      tickMargin={6}
                      stroke='rgba(148, 163, 184, 0.6)'
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                      contentStyle={{
                        background: 'rgba(15, 23, 42, 0.9)',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        borderRadius: '8px',
                        color: '#e6edf7',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey='count' radius={[6, 6, 0, 0]} fill='url(#tasksGradient)'>
                      {chartData.map((entry, index) => {
                        const isPeak = chartSummary?.peak.label === entry.label
                        return (
                          <Cell
                            key={`cell-${index}`}
                            stroke={isPeak ? '#f59e0b' : 'transparent'}
                            strokeWidth={isPeak ? 2 : 0}
                            fillOpacity={isPeak ? 1 : 0.85}
                          />
                        )
                      })}
                    </Bar>
                    <defs>
                      <linearGradient id='tasksGradient' x1='0' x2='0' y1='0' y2='1'>
                        <stop offset='0%' stopColor='#38bdf8' />
                        <stop offset='100%' stopColor='#22d3ee' />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className={glassCard}>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <CheckCircle2 className='h-4 w-4' />
                今日任务
                {todayTasks ? (
                  <Badge variant='secondary' className='ml-2'>
                    {todayTasks.pending_count} 待处理
                  </Badge>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayTasks && todayTasks.tasks.length > 0 ? (
                <div className='max-h-[200px] space-y-2 overflow-y-auto pr-1'>
                  {todayTasks.tasks.map((task) => {
                    const status =
                      ACTIVITY_STATUS[task.status as keyof typeof ACTIVITY_STATUS] ??
                      ACTIVITY_STATUS.pending
                    return (
                      <div
                        key={task.id}
                        className='flex items-center justify-between rounded-lg border border-white/10 bg-white/60 px-3 py-2 text-sm dark:bg-slate-900/50'
                      >
                        <div className='flex items-center gap-2'>
                          {task.exec_time ? (
                            <span className='text-muted-foreground text-xs'>
                              {task.exec_time.slice(0, 5)}
                            </span>
                          ) : null}
                          <span>{task.from_bank_name}</span>
                          <ArrowRight className='text-muted-foreground h-3 w-3' />
                          <span>{task.to_bank_name}</span>
                        </div>
                        <div className='flex items-center gap-3'>
                          <span className='font-fira-code font-medium'>${task.amount}</span>
                          <Badge variant={status.badge} className='text-xs'>
                            {status.label}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className='text-muted-foreground py-6 text-center text-sm'>
                  今日暂无待执行任务
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className='space-y-4'>
          <Card className={glassCard}>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <Calendar className='h-4 w-4 text-muted-foreground' />
                任务日历
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CalendarView
                data={calendarData}
                onMonthChange={handleMonthChange}
                density='compact'
              />
            </CardContent>
          </Card>

          <Card className={glassCard}>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-base'>最近活动</CardTitle>
              <span className='text-muted-foreground text-xs'>最新 8 条</span>
            </CardHeader>
            <CardContent>
              {recentActivities.length === 0 ? (
                <div className='text-muted-foreground py-6 text-center text-sm'>
                  暂无活动记录
                </div>
              ) : (
                <div className='space-y-4'>
                  {recentActivities.map((activity, index) => {
                    const status =
                      ACTIVITY_STATUS[activity.status as keyof typeof ACTIVITY_STATUS] ??
                      ACTIVITY_STATUS.pending
                    return (
                      <div key={activity.id} className='flex gap-3'>
                        <div className='flex flex-col items-center'>
                          <span className={cn('mt-1 h-2 w-2 rounded-full', status.dot)} />
                          {index !== recentActivities.length - 1 ? (
                            <span className='mt-1 w-px flex-1 bg-border/70' />
                          ) : null}
                        </div>
                        <div className='flex-1 rounded-lg border border-white/10 bg-white/60 p-3 text-sm dark:bg-slate-900/50'>
                          <div className='flex items-center justify-between'>
                            <div className='flex items-center gap-2'>
                              <span>{activity.from_bank}</span>
                              <ArrowRight className='text-muted-foreground h-3 w-3' />
                              <span>{activity.to_bank}</span>
                            </div>
                            <Badge variant={status.badge} className='text-xs'>
                              {status.label}
                            </Badge>
                          </div>
                          <div className='text-muted-foreground mt-2 flex items-center justify-between text-xs'>
                            <span className='font-fira-code'>${activity.amount}</span>
                            <span>{activity.exec_date}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className='pointer-events-none fixed bottom-6 right-6 z-50'>
        <div className='pointer-events-auto flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/60 p-2 opacity-90 shadow-lg backdrop-blur-lg transition-all duration-200 hover:bg-white/80 hover:opacity-100 hover:shadow-xl dark:bg-slate-900/50 dark:hover:bg-slate-900/70'>
          <Button
            variant='ghost'
            size='sm'
            className='h-10 justify-start gap-2 rounded-full px-3 text-xs'
            onClick={handleSendReminder}
            disabled={sendingReminder}
          >
            {sendingReminder ? (
              <Loader2 className='h-3.5 w-3.5 animate-spin' />
            ) : (
              <Bell className='h-3.5 w-3.5' />
            )}
            发送提醒
          </Button>
          <Button
            size='sm'
            className='h-10 justify-start gap-2 rounded-full px-3 text-xs'
            onClick={handleCompleteAll}
            disabled={completingAll || !todayTasks || todayTasks.pending_count === 0}
          >
            {completingAll ? (
              <Loader2 className='h-3.5 w-3.5 animate-spin' />
            ) : (
              <Check className='h-3.5 w-3.5' />
            )}
            全部完成
          </Button>
          <Button
            variant='outline'
            size='sm'
            className='h-10 justify-start gap-2 rounded-full px-3 text-xs'
            onClick={handlePostponeToday}
            disabled={postponing || !todayTasks || todayTasks.pending_count === 0}
          >
            {postponing ? (
              <Loader2 className='h-3.5 w-3.5 animate-spin' />
            ) : (
              <FastForward className='h-3.5 w-3.5' />
            )}
            推迟到明天
          </Button>
        </div>
      </div>
    </Main>
  )
}
