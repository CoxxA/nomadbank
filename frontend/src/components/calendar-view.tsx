import * as React from 'react'
import { CheckCircle2, ChevronLeft, ChevronRight, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { CalendarDay } from '@/lib/types'
import { cn } from '@/lib/utils'

/** 日历任务项（用于任务详情展示） */
interface CalendarTaskItem {
  id: string
  exec_date: string
  exec_time?: string
  from_bank_name: string
  to_bank_name: string
  amount: number
  status: string
}

interface CalendarViewProps {
  /** 日历数据（日期 -> 任务统计） */
  data?: CalendarDay[]
  /** 任务列表（用于详情展示） */
  tasks?: CalendarTaskItem[]
  /** 月份变化回调 */
  onMonthChange?: (startDate: string, endDate: string) => void
  /** 完成任务回调 */
  onComplete?: (taskId: string) => void
  /** 跳过任务回调 */
  onSkip?: (taskId: string) => void
  className?: string
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export function CalendarView({
  data,
  tasks,
  onMonthChange,
  onComplete,
  onSkip,
  className,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = React.useState(new Date())
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // 当月第一天和最后一天
  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)

  // 日历开始日期（上月末尾填充）
  const startDay = firstDayOfMonth.getDay()
  const calendarStart = new Date(year, month, 1 - startDay)

  // 计算需要显示的周数（5或6周）
  const totalDays = startDay + lastDayOfMonth.getDate()
  const weeksNeeded = Math.ceil(totalDays / 7)

  // 构建日历格子（二维数组：周 -> 日）
  const weeks = React.useMemo(() => {
    const result: Date[][] = []
    let currentWeek: Date[] = []
    const tempDate = new Date(calendarStart)

    for (let i = 0; i < weeksNeeded * 7; i++) {
      currentWeek.push(new Date(tempDate))
      tempDate.setDate(tempDate.getDate() + 1)
      if (currentWeek.length === 7) {
        result.push(currentWeek)
        currentWeek = []
      }
    }
    return result
  }, [calendarStart, weeksNeeded])

  // 创建日期到数据的映射
  const dataMap = React.useMemo(() => {
    const map: Record<string, CalendarDay> = {}

    if (data) {
      data.forEach((item) => {
        map[item.date] = item
      })
    } else if (tasks) {
      // 从 tasks 构建数据
      tasks.forEach((task) => {
        if (!map[task.exec_date]) {
          map[task.exec_date] = {
            date: task.exec_date,
            task_count: 0,
            has_pending: false,
          }
        }
        map[task.exec_date].task_count++
        if (task.status === 'pending') {
          map[task.exec_date].has_pending = true
        }
      })
    }

    return map
  }, [data, tasks])

  // 获取选中日期的任务列表
  const selectedTasks = React.useMemo(() => {
    if (!selectedDate || !tasks) return []
    return tasks.filter((t) => t.exec_date === selectedDate)
  }, [selectedDate, tasks])

  // 追踪是否是首次渲染（跳过首次渲染时的请求，因为父组件已加载当月数据）
  const isFirstRender = React.useRef(true)

  // 月份变化时通知父组件（跳过首次渲染）
  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (onMonthChange) {
      const lastDay = new Date(year, month + 1, 0).getDate()
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`
      onMonthChange(startDate, endDate)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month])

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const formatDateKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === month
  }

  return (
    <div className={cn('w-full', className)}>
      {/* 月份导航 */}
      <div className='mb-1 flex items-center justify-between'>
        <div className='flex items-center gap-1'>
          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7'
            onClick={goToPreviousMonth}
          >
            <ChevronLeft className='h-4 w-4' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7'
            onClick={goToNextMonth}
          >
            <ChevronRight className='h-4 w-4' />
          </Button>
        </div>
        <span className='text-sm font-medium'>
          {year}年{month + 1}月
        </span>
        <Button
          variant='ghost'
          size='sm'
          className='h-7 text-xs'
          onClick={goToToday}
        >
          今天
        </Button>
      </div>

      {/* 星期标题 */}
      <div className='mb-0.5 grid grid-cols-7'>
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className='text-muted-foreground py-0.5 text-center text-xs font-medium'
          >
            {day}
          </div>
        ))}
      </div>

      {/* 日历格子 */}
      <div className='grid grid-cols-7 gap-0.5'>
        {weeks.flat().map((date, index) => {
          const dateKey = formatDateKey(date)
          const dayData = dataMap[dateKey]
          const hasTask = dayData && dayData.task_count > 0
          const hasPending = dayData?.has_pending
          const isSelected = selectedDate === dateKey

          return (
            <div
              key={index}
              onClick={() => {
                if (tasks && hasTask) {
                  setSelectedDate(isSelected ? null : dateKey)
                }
              }}
              className={cn(
                'relative flex h-7 items-center justify-center rounded-md text-xs transition-colors',
                isCurrentMonth(date)
                  ? 'text-foreground'
                  : 'text-muted-foreground/40',
                // 今日
                isToday(date) &&
                  !isSelected &&
                  'bg-primary text-primary-foreground font-medium',
                // 选中
                isSelected && 'bg-accent ring-primary ring-1',
                // 有待处理任务
                hasTask &&
                  !isToday(date) &&
                  !isSelected &&
                  hasPending &&
                  'bg-orange-500/10',
                // 已完成任务
                hasTask &&
                  !isToday(date) &&
                  !isSelected &&
                  !hasPending &&
                  'bg-green-500/10',
                // 有任务时悬停效果
                tasks && hasTask && 'hover:bg-accent cursor-pointer'
              )}
            >
              {date.getDate()}
              {hasTask && (
                <div className='absolute bottom-0.5 left-1/2 flex -translate-x-1/2 gap-0.5'>
                  <div
                    className={cn(
                      'h-1 w-1 rounded-full',
                      hasPending ? 'bg-orange-500' : 'bg-green-500'
                    )}
                  />
                  {dayData.task_count > 1 && (
                    <span className='text-muted-foreground text-[8px]'>
                      {dayData.task_count}
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 图例 */}
      <div className='text-muted-foreground mt-1.5 flex items-center justify-center gap-3 text-xs'>
        <div className='flex items-center gap-1'>
          <div className='h-1.5 w-1.5 rounded-full bg-orange-500' />
          <span>待执行</span>
        </div>
        <div className='flex items-center gap-1'>
          <div className='h-1.5 w-1.5 rounded-full bg-green-500' />
          <span>已完成</span>
        </div>
      </div>

      {/* 选中日期的任务详情 */}
      {selectedDate && selectedTasks.length > 0 && (
        <div className='mt-4 border-t pt-4'>
          <div className='mb-2 flex items-center justify-between'>
            <h4 className='text-sm font-medium'>
              {selectedDate} 的任务 ({selectedTasks.length})
            </h4>
            <Button
              variant='ghost'
              size='sm'
              className='h-6 text-xs'
              onClick={() => setSelectedDate(null)}
            >
              关闭
            </Button>
          </div>
          <div className='max-h-60 space-y-2 overflow-y-auto'>
            {selectedTasks.map((task) => (
              <div
                key={task.id}
                className='border-border/50 bg-card rounded-md border p-2 text-sm'
              >
                <div className='flex items-center justify-between'>
                  <div className='flex-1'>
                    <div className='flex items-center gap-2'>
                      {task.exec_time && (
                        <span className='text-muted-foreground text-xs'>
                          {task.exec_time.slice(0, 5)}
                        </span>
                      )}
                      <span className='font-medium'>{task.from_bank_name}</span>
                      <span className='text-muted-foreground'>→</span>
                      <span>{task.to_bank_name}</span>
                    </div>
                    <div className='text-muted-foreground mt-0.5 text-xs'>
                      ${task.amount.toFixed(2)}
                    </div>
                  </div>
                  <div className='flex items-center gap-1'>
                    {task.status === 'pending' ? (
                      <>
                        {onComplete && (
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-6 w-6 text-green-600'
                            onClick={() => onComplete(task.id)}
                            title='标记完成'
                          >
                            <CheckCircle2 className='h-3.5 w-3.5' />
                          </Button>
                        )}
                        {onSkip && (
                          <Button
                            variant='ghost'
                            size='icon'
                            className='text-muted-foreground h-6 w-6'
                            onClick={() => onSkip(task.id)}
                            title='跳过'
                          >
                            <XCircle className='h-3.5 w-3.5' />
                          </Button>
                        )}
                      </>
                    ) : (
                      <Badge
                        variant='outline'
                        className={cn(
                          'text-xs',
                          task.status === 'completed' && 'text-green-600',
                          task.status === 'skipped' && 'text-gray-500'
                        )}
                      >
                        {task.status === 'completed' ? '已完成' : '已跳过'}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
