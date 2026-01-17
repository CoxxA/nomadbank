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
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CalendarView } from '@/components/calendar-view'
import { Main } from '@/components/layout/main'
import {
  useCalendarData,
  useDashboardStats,
  useNextDayTasks,
  useRecentActivities,
  useRefreshQueries,
  useTodayTasks,
} from '@/hooks/use-queries'
import { notificationsApi, tasksApi } from '@/lib/api'

export function Dashboard() {
  const [sendingReminder, setSendingReminder] = useState(false)
  const [completingAll, setCompletingAll] = useState(false)
  const [postponing, setPostponing] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  // 计算日历日期范围
  const { calendarStartDate, calendarEndDate } = useMemo(() => {
    const { year, month } = calendarMonth
    const lastDay = new Date(year, month + 1, 0).getDate()
    return {
      calendarStartDate: `${year}-${String(month + 1).padStart(2, '0')}-01`,
      calendarEndDate: `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`,
    }
  }, [calendarMonth])

  // 使用 TanStack Query hooks 加载数据（自动缓存）
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: recentActivities = [] } = useRecentActivities(5)
  const { data: nextDayTasks } = useNextDayTasks()
  const { data: todayTasks } = useTodayTasks()
  const { data: calendarData = [] } = useCalendarData(
    calendarStartDate,
    calendarEndDate
  )
  const { refreshStats } = useRefreshQueries()

  const loading = statsLoading

  // 日历月份变化时更新状态（TanStack Query 会自动缓存）
  const handleMonthChange = useCallback((startDate: string) => {
    // 解析日期获取年月
    const [year, month] = startDate.split('-').map(Number)
    setCalendarMonth({ year, month: month - 1 })
  }, [])

  // 发送今日任务提醒
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

  // 一键完成今日任务
  const handleCompleteAll = async () => {
    if (!todayTasks || todayTasks.pending_count === 0) {
      toast.info('今日没有待处理任务')
      return
    }
    setCompletingAll(true)
    try {
      const result = await tasksApi.batchCompleteToday()
      toast.success(result.message)
      refreshStats()
    } catch {
      toast.error('操作失败')
    } finally {
      setCompletingAll(false)
    }
  }

  // 推迟今日任务
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
      refreshStats()
    } catch {
      toast.error('操作失败')
    } finally {
      setPostponing(false)
    }
  }

  return (
    <Main>
      {loading ? (
        <div className='space-y-4'>
          <h1 className='text-2xl font-bold'>仪表盘</h1>
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className='animate-pulse'>
                  <div className='bg-muted h-4 w-24 rounded' />
                  <div className='bg-muted h-8 w-16 rounded' />
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className='space-y-3'>
          <h1 className='text-2xl font-bold'>仪表盘</h1>

          {/* 统计卡片 */}
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-muted-foreground text-sm font-medium'>
                  年度操作
                </CardTitle>
                <TrendingUp className='text-muted-foreground h-4 w-4' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {stats?.completed_tasks_year || 0}
                  <span className='text-muted-foreground text-sm font-normal'>
                    {' '}
                    / {stats?.total_tasks_year || 0}
                  </span>
                </div>
                <p className='text-muted-foreground text-xs'>已完成 / 总计</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-muted-foreground text-sm font-medium'>
                  本月操作
                </CardTitle>
                <Calendar className='text-muted-foreground h-4 w-4' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {stats?.completed_tasks_month || 0}
                  <span className='text-muted-foreground text-sm font-normal'>
                    {' '}
                    / {stats?.total_tasks_month || 0}
                  </span>
                </div>
                <p className='text-muted-foreground text-xs'>已完成 / 总计</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-muted-foreground text-sm font-medium'>
                  待执行任务
                </CardTitle>
                <Clock className='text-muted-foreground h-4 w-4' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {stats?.pending_tasks || 0}
                </div>
                <p className='text-muted-foreground text-xs'>等待执行</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-muted-foreground text-sm font-medium'>
                  银行数量
                </CardTitle>
                <Landmark className='text-muted-foreground h-4 w-4' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {stats?.banks_count || 0}
                </div>
                <p className='text-muted-foreground text-xs'>已添加银行</p>
              </CardContent>
            </Card>
          </div>

          {/* 今日任务快捷操作 */}
          {todayTasks && todayTasks.tasks.length > 0 && (
            <Card>
              <CardHeader className='px-4 py-3'>
                <div className='flex items-center justify-between'>
                  <CardTitle className='flex items-center gap-2 text-base'>
                    <CheckCircle2 className='h-4 w-4' />
                    今日任务
                    <Badge variant='secondary' className='ml-1'>
                      {todayTasks.pending_count} 待处理
                    </Badge>
                  </CardTitle>
                  <div className='flex gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      className='h-7 text-xs'
                      onClick={handlePostponeToday}
                      disabled={postponing || todayTasks.pending_count === 0}
                    >
                      {postponing ? (
                        <Loader2 className='mr-1 h-3 w-3 animate-spin' />
                      ) : (
                        <FastForward className='mr-1 h-3 w-3' />
                      )}
                      推迟明天
                    </Button>
                    <Button
                      size='sm'
                      className='h-7 text-xs'
                      onClick={handleCompleteAll}
                      disabled={completingAll || todayTasks.pending_count === 0}
                    >
                      {completingAll ? (
                        <Loader2 className='mr-1 h-3 w-3 animate-spin' />
                      ) : (
                        <Check className='mr-1 h-3 w-3' />
                      )}
                      全部完成
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className='px-4 pt-0 pb-4'>
                <div className='max-h-[120px] space-y-1 overflow-y-auto'>
                  {todayTasks.tasks.map((task) => (
                    <div
                      key={task.id}
                      className='bg-background/50 flex items-center justify-between rounded px-2 py-1 text-sm'
                    >
                      <div className='flex items-center gap-1.5'>
                        {task.exec_time && (
                          <span className='text-muted-foreground w-10 text-xs'>
                            {task.exec_time.slice(0, 5)}
                          </span>
                        )}
                        <span>{task.from_bank_name}</span>
                        <ArrowRight className='text-muted-foreground h-3 w-3' />
                        <span>{task.to_bank_name}</span>
                      </div>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium'>${task.amount}</span>
                        <Badge
                          variant={
                            task.status === 'completed' ? 'default' : 'outline'
                          }
                          className='text-xs'
                        >
                          {task.status === 'completed' ? '已完成' : '待处理'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 双列布局：倒计时 + 日历 */}
          <div className='grid gap-3 lg:grid-cols-2'>
            {/* 倒计时卡片 */}
            <Card>
              <CardHeader className='px-4 py-3'>
                <div className='flex items-center justify-between'>
                  <CardTitle className='flex items-center gap-2 text-base'>
                    <Clock className='text-muted-foreground h-4 w-4' />
                    下次操作倒计时
                  </CardTitle>
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-7 text-xs'
                    onClick={handleSendReminder}
                    disabled={sendingReminder}
                  >
                    {sendingReminder ? (
                      <Loader2 className='mr-1 h-3 w-3 animate-spin' />
                    ) : (
                      <Bell className='mr-1 h-3 w-3' />
                    )}
                    发送提醒
                  </Button>
                </div>
              </CardHeader>
              <CardContent className='px-4 pt-0 pb-4'>
                {nextDayTasks ? (
                  <div className='space-y-2'>
                    {/* 倒计时 */}
                    <div className='flex items-baseline gap-2'>
                      <span className='text-primary text-3xl font-bold'>
                        {nextDayTasks.days_until}
                      </span>
                      <span className='text-muted-foreground text-sm'>
                        天后 · {nextDayTasks.date}
                      </span>
                    </div>

                    {/* 任务列表 */}
                    {nextDayTasks.tasks.length > 0 && (
                      <div className='max-h-[100px] space-y-1 overflow-y-auto'>
                        {nextDayTasks.tasks.map((task) => (
                          <div
                            key={task.id}
                            className='bg-background/50 flex items-center justify-between rounded px-2 py-1 text-sm'
                          >
                            <div className='flex items-center gap-1.5'>
                              {task.exec_time && (
                                <span className='text-muted-foreground w-10 text-xs'>
                                  {task.exec_time.slice(0, 5)}
                                </span>
                              )}
                              <span>{task.from_bank_name}</span>
                              <ArrowRight className='text-muted-foreground h-3 w-3' />
                              <span>{task.to_bank_name}</span>
                            </div>
                            <span className='font-medium'>${task.amount}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className='text-muted-foreground py-2 text-center text-sm'>
                    暂无待执行任务
                  </p>
                )}
              </CardContent>
            </Card>

            {/* 日历视图 */}
            <Card>
              <CardHeader className='px-4 py-3'>
                <CardTitle className='flex items-center gap-2 text-base'>
                  <Calendar className='text-muted-foreground h-4 w-4' />
                  任务日历
                </CardTitle>
              </CardHeader>
              <CardContent className='px-4 pt-0 pb-4'>
                <CalendarView
                  data={calendarData}
                  onMonthChange={handleMonthChange}
                />
              </CardContent>
            </Card>
          </div>

          {/* 最近活动 */}
          <Card>
            <CardHeader className='px-4 py-3'>
              <CardTitle className='text-base'>最近活动</CardTitle>
            </CardHeader>
            <CardContent className='px-4 pt-0 pb-4'>
              {recentActivities.length === 0 ? (
                <p className='text-muted-foreground py-2 text-center text-sm'>
                  暂无活动记录
                </p>
              ) : (
                <div className='space-y-1.5'>
                  {recentActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className='flex items-center justify-between text-sm'
                    >
                      <div className='flex items-center gap-1.5'>
                        <span>{activity.from_bank}</span>
                        <ArrowRight className='text-muted-foreground h-3 w-3' />
                        <span>{activity.to_bank}</span>
                      </div>
                      <div className='flex items-center gap-3'>
                        <span className='font-medium'>${activity.amount}</span>
                        <Badge
                          variant={
                            activity.status === 'completed'
                              ? 'default'
                              : activity.status === 'skipped'
                                ? 'secondary'
                                : 'outline'
                          }
                          className='text-xs'
                        >
                          {activity.status === 'completed'
                            ? '已完成'
                            : activity.status === 'skipped'
                              ? '已跳过'
                              : '待执行'}
                        </Badge>
                        <span className='text-muted-foreground text-xs'>
                          {activity.exec_date}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </Main>
  )
}
