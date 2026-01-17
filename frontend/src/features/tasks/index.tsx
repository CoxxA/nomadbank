/**
 * 任务管理页面 - 任务历史日志
 */
import { useEffect, useState } from 'react'
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileText,
  List,
  Loader2,
  Search as SearchIcon,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { CalendarView } from '@/components/calendar-view'
import { Main } from '@/components/layout/main'
import {
  useBankGroups,
  useBanks,
  useRefreshQueries,
  useStrategies,
  useTaskCycles,
  useTasks,
} from '@/hooks/use-queries'
import { importExportApi, tasksApi } from '@/lib/api'
import type { CompleteTaskRequest, Task } from '@/lib/types'
import { useAuthStore } from '@/stores/auth-store'

export function Tasks() {
  const { refreshTasks } = useRefreshQueries()
  const { accessToken } = useAuthStore((state) => state.auth)

  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generateForm, setGenerateForm] = useState({
    strategy_id: '',
    cycles: 4,
    group: '', // 空字符串表示全部
  })
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  // 完成任务对话框
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [completingTask, setCompletingTask] = useState<Task | null>(null)
  const [completeNotes, setCompleteNotes] = useState('')
  const [completing, setCompleting] = useState(false)

  // 使用 TanStack Query hooks 加载数据（自动缓存）
  const { data: tasks = [], isLoading: tasksLoading } = useTasks()
  const { data: banks = [] } = useBanks()
  const { data: strategies = [] } = useStrategies()
  const { data: cyclesData } = useTaskCycles()
  const { data: groupsData } = useBankGroups()

  const cycles = cyclesData?.cycles || []
  const groups = groupsData?.groups || []
  const loading = tasksLoading

  // 设置默认策略（使用第一个系统策略）
  useEffect(() => {
    if (strategies.length > 0 && !generateForm.strategy_id) {
      const systemStrategy = strategies.find((s) => s.is_system)
      if (systemStrategy) {
        setGenerateForm((prev) => ({ ...prev, strategy_id: systemStrategy.id }))
      } else if (strategies[0]) {
        setGenerateForm((prev) => ({ ...prev, strategy_id: strategies[0].id }))
      }
    }
  }, [strategies, generateForm.strategy_id])

  // 根据银行 ID 获取银行名称
  const getBankName = (bankId: string) => {
    const bank = banks.find((b) => b.id === bankId)
    return bank?.name || '未知银行'
  }

  // 打开完成任务对话框
  const openCompleteDialog = (task: Task) => {
    setCompletingTask(task)
    setCompleteNotes('')
    setCompleteDialogOpen(true)
  }

  // 标记完成（带备注）
  const handleComplete = async () => {
    if (!completingTask) return

    setCompleting(true)
    try {
      const data: CompleteTaskRequest | undefined = completeNotes.trim()
        ? { notes: completeNotes.trim() }
        : undefined
      await tasksApi.complete(completingTask.id, data)
      toast.success('任务已完成')
      setCompleteDialogOpen(false)
      setCompletingTask(null)
      refreshTasks()
    } catch (error) {
      toast.error('操作失败')
      console.error(error)
    } finally {
      setCompleting(false)
    }
  }

  // 快速完成（不填备注）
  const handleQuickComplete = async (task: Task) => {
    try {
      await tasksApi.complete(task.id)
      toast.success('任务已完成')
      refreshTasks()
    } catch (error) {
      toast.error('操作失败')
      console.error(error)
    }
  }

  // 跳过任务
  const handleSkip = async (task: Task) => {
    try {
      await tasksApi.skip(task.id)
      toast.success('任务已跳过')
      refreshTasks()
    } catch (error) {
      toast.error('操作失败')
      console.error(error)
    }
  }

  // 删除任务
  const handleDelete = async (task: Task) => {
    if (!confirm('确定要删除这个任务吗？')) return

    try {
      await tasksApi.delete(task.id)
      toast.success('任务已删除')
      refreshTasks()
    } catch (error) {
      toast.error('删除失败')
      console.error(error)
    }
  }

  // 批量删除
  const handleBatchDelete = async (
    type: 'selected' | 'completed' | 'all' | number
  ) => {
    let confirmMessage = ''
    if (type === 'selected') {
      if (selectedTasks.size === 0) {
        toast.error('请先选择要删除的任务')
        return
      }
      confirmMessage = `确定要删除选中的 ${selectedTasks.size} 个任务吗？`
    } else if (type === 'completed') {
      confirmMessage = '确定要删除所有已完成的任务吗？'
    } else if (type === 'all') {
      confirmMessage = '确定要删除全部任务吗？此操作不可恢复！'
    } else {
      confirmMessage = `确定要删除周期 ${type} 的所有任务吗？`
    }

    if (!confirm(confirmMessage)) return

    setDeleting(true)
    try {
      let result
      if (type === 'selected') {
        result = await tasksApi.batchDelete({
          task_ids: Array.from(selectedTasks),
        })
      } else if (type === 'completed') {
        result = await tasksApi.batchDelete({ delete_completed: true })
      } else if (type === 'all') {
        result = await tasksApi.batchDelete({ delete_all: true })
      } else {
        result = await tasksApi.batchDelete({ delete_cycle: type })
      }
      toast.success(result.message)
      setSelectedTasks(new Set())
      refreshTasks()
    } catch (error) {
      toast.error('删除失败')
      console.error(error)
    } finally {
      setDeleting(false)
    }
  }

  // 打开生成对话框
  const handleOpenGenerateDialog = () => {
    setGenerateDialogOpen(true)
  }

  // 生成任务
  const handleGenerate = async () => {
    if (!generateForm.strategy_id) {
      toast.error('请选择策略')
      return
    }

    setGenerating(true)
    try {
      const params: {
        strategy_id: string
        cycles: number
        group?: string
      } = {
        strategy_id: generateForm.strategy_id,
        cycles: generateForm.cycles,
      }

      // 如果选择了分组则传入
      if (generateForm.group) {
        params.group = generateForm.group
      }

      await tasksApi.generate(params)
      toast.success('任务生成成功')
      setGenerateDialogOpen(false)
      refreshTasks()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '生成任务失败')
      console.error(error)
    } finally {
      setGenerating(false)
    }
  }

  // 导出任务
  const handleExport = async () => {
    try {
      if (!accessToken) {
        toast.error('请先登录')
        return
      }

      const url = importExportApi.exportTasksUrl(
        statusFilter !== 'all' ? statusFilter : undefined
      )

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        throw new Error('导出失败')
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `tasks_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)

      toast.success('导出成功')
    } catch (error) {
      toast.error('导出失败')
      console.error(error)
    }
  }

  // 过滤任务
  const filteredTasks = tasks.filter((task) => {
    // 状态筛选
    if (statusFilter !== 'all' && task.status !== statusFilter) return false

    // 搜索筛选
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const fromBankName = getBankName(task.from_bank_id).toLowerCase()
      const toBankName = getBankName(task.to_bank_id).toLowerCase()
      const memo = (task.memo || '').toLowerCase()
      const amount = task.amount.toString()
      const date = task.exec_date

      return (
        fromBankName.includes(query) ||
        toBankName.includes(query) ||
        memo.includes(query) ||
        amount.includes(query) ||
        date.includes(query)
      )
    }

    return true
  })

  // 先按周期升序，同一周期内按执行日期升序
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    // 先比较周期
    if (a.cycle !== b.cycle) {
      return a.cycle - b.cycle
    }
    // 同一周期内按执行日期升序
    const dateA = new Date(a.exec_date)
    const dateB = new Date(b.exec_date)
    return dateA.getTime() - dateB.getTime()
  })

  // 分页
  const totalPages = Math.ceil(sortedTasks.length / pageSize)
  const paginatedTasks = sortedTasks.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  // 当筛选条件改变时重置页码
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, searchQuery])

  // 全选/取消全选（当前页）
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTasks(new Set(paginatedTasks.map((t) => t.id)))
    } else {
      setSelectedTasks(new Set())
    }
  }

  // 选择单个任务
  const handleSelectTask = (taskId: string, checked: boolean) => {
    const newSelected = new Set(selectedTasks)
    if (checked) {
      newSelected.add(taskId)
    } else {
      newSelected.delete(taskId)
    }
    setSelectedTasks(newSelected)
  }

  // 获取状态徽章
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant='default' className='bg-green-500'>
            <CheckCircle2 className='mr-1 h-3 w-3' />
            已完成
          </Badge>
        )
      case 'skipped':
        return (
          <Badge variant='secondary'>
            <XCircle className='mr-1 h-3 w-3' />
            已跳过
          </Badge>
        )
      default:
        return (
          <Badge variant='outline'>
            <Clock className='mr-1 h-3 w-3' />
            待执行
          </Badge>
        )
    }
  }

  // 格式化日期 (YYYY/MM/DD)
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}/${month}/${day}`
  }

  // 格式化时间（从完整日期时间中提取）
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // 周期颜色映射
  const cycleColors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-cyan-500',
    'bg-yellow-500',
    'bg-red-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-lime-500',
    'bg-amber-500',
  ]

  // 获取周期显示文本
  const getCycleText = (cycle: number) => {
    const texts = [
      '第一轮',
      '第二轮',
      '第三轮',
      '第四轮',
      '第五轮',
      '第六轮',
      '第七轮',
      '第八轮',
      '第九轮',
      '第十轮',
      '第十一轮',
      '第十二轮',
    ]
    return texts[cycle - 1] || `第${cycle}轮`
  }

  // 获取周期徽章
  const getCycleBadge = (cycle: number) => {
    const colorClass = cycleColors[(cycle - 1) % cycleColors.length]
    return (
      <Badge className={`${colorClass} text-white`}>
        {getCycleText(cycle)}
      </Badge>
    )
  }

  const isAllSelected =
    paginatedTasks.length > 0 && selectedTasks.size === paginatedTasks.length

  return (
    <>
      <Main>
        <div className='space-y-6'>
          <div className='flex items-center justify-between'>
            <h1 className='text-2xl font-bold'>任务列表</h1>
            <div className='flex gap-2'>
              {/* 视图切换 */}
              <div className='flex rounded-md border'>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size='sm'
                  className='rounded-r-none'
                  onClick={() => setViewMode('list')}
                >
                  <List className='h-4 w-4' />
                </Button>
                <Button
                  variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                  size='sm'
                  className='rounded-l-none'
                  onClick={() => setViewMode('calendar')}
                >
                  <Calendar className='h-4 w-4' />
                </Button>
              </div>

              <div className='relative'>
                <SearchIcon className='text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4' />
                <Input
                  placeholder='搜索银行、备注、金额...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='w-48 pl-8'
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className='w-32'>
                  <SelectValue placeholder='筛选状态' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>全部</SelectItem>
                  <SelectItem value='pending'>待执行</SelectItem>
                  <SelectItem value='completed'>已完成</SelectItem>
                  <SelectItem value='skipped'>已跳过</SelectItem>
                </SelectContent>
              </Select>

              {/* 批量删除下拉菜单 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='outline' disabled={deleting}>
                    {deleting ? (
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    ) : (
                      <Trash2 className='mr-2 h-4 w-4' />
                    )}
                    批量删除
                    <ChevronDown className='ml-2 h-4 w-4' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  <DropdownMenuItem
                    onClick={() => handleBatchDelete('selected')}
                    disabled={selectedTasks.size === 0}
                  >
                    删除选中 ({selectedTasks.size})
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleBatchDelete('completed')}
                  >
                    删除已完成
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {cycles.map((cycle) => (
                    <DropdownMenuItem
                      key={cycle}
                      onClick={() => handleBatchDelete(cycle)}
                    >
                      删除周期 {cycle}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleBatchDelete('all')}
                    className='text-destructive'
                  >
                    删除全部
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant='outline' onClick={handleExport}>
                <Download className='mr-2 h-4 w-4' />
                导出
              </Button>
              <Button onClick={handleOpenGenerateDialog}>
                <Sparkles className='mr-2 h-4 w-4' />
                生成任务
              </Button>
            </div>
          </div>

          {/* 生成任务对话框 */}
          <Dialog
            open={generateDialogOpen}
            onOpenChange={setGenerateDialogOpen}
          >
            <DialogContent className='max-w-lg'>
              <DialogHeader>
                <DialogTitle>生成保活任务</DialogTitle>
                <DialogDescription>
                  根据策略自动生成转账任务，系统会智能安排任务日期和金额
                </DialogDescription>
              </DialogHeader>
              <div className='grid gap-4 py-4'>
                {/* 选择策略 */}
                <div className='space-y-2'>
                  <Label>选择策略</Label>
                  <Select
                    value={generateForm.strategy_id}
                    onValueChange={(value) =>
                      setGenerateForm({ ...generateForm, strategy_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='选择策略' />
                    </SelectTrigger>
                    <SelectContent>
                      {strategies.map((strategy) => (
                        <SelectItem key={strategy.id} value={strategy.id}>
                          {strategy.name}
                          {strategy.is_system && ' (系统)'}
                          <span className='text-muted-foreground ml-2 text-xs'>
                            {strategy.interval_min}-{strategy.interval_max}天
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 选择分组 */}
                <div className='space-y-2'>
                  <Label>银行分组</Label>
                  <Select
                    value={generateForm.group || '__all__'}
                    onValueChange={(value) =>
                      setGenerateForm({
                        ...generateForm,
                        group: value === '__all__' ? '' : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='选择分组' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='__all__'>全部银行</SelectItem>
                      {groups.map((group) => (
                        <SelectItem key={group} value={group}>
                          {group}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className='text-muted-foreground text-xs'>
                    选择分组后，只在该分组的银行之间生成转账任务
                  </p>
                </div>

                {/* 生成周期数 */}
                <div className='space-y-2'>
                  <Label>生成周期数</Label>
                  <Input
                    type='number'
                    min='1'
                    max='12'
                    value={generateForm.cycles}
                    onChange={(e) =>
                      setGenerateForm({
                        ...generateForm,
                        cycles: parseInt(e.target.value) || 4,
                      })
                    }
                  />
                  <p className='text-muted-foreground text-xs'>
                    每个周期内所有银行都会有转入和转出，如已有任务会自动接续生成
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant='outline'
                  onClick={() => setGenerateDialogOpen(false)}
                >
                  取消
                </Button>
                <Button onClick={handleGenerate} disabled={generating}>
                  {generating && (
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  )}
                  生成任务
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 完成任务对话框 */}
          <Dialog
            open={completeDialogOpen}
            onOpenChange={setCompleteDialogOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>完成任务</DialogTitle>
                <DialogDescription>
                  {completingTask && (
                    <>
                      {getBankName(completingTask.from_bank_id)} →{' '}
                      {getBankName(completingTask.to_bank_id)}
                      {' · '}${completingTask.amount.toFixed(2)}
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className='space-y-4 py-4'>
                <div className='space-y-2'>
                  <Label>执行备注 (可选)</Label>
                  <Textarea
                    placeholder='记录执行情况、截图链接等...'
                    value={completeNotes}
                    onChange={(e) => setCompleteNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant='outline'
                  onClick={() => setCompleteDialogOpen(false)}
                >
                  取消
                </Button>
                <Button onClick={handleComplete} disabled={completing}>
                  {completing && (
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  )}
                  确认完成
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {loading ? (
            <div className='flex items-center justify-center py-12'>
              <Loader2 className='text-muted-foreground h-8 w-8 animate-spin' />
            </div>
          ) : tasks.length === 0 ? (
            <Card>
              <CardContent className='py-12 text-center'>
                <p className='text-muted-foreground'>
                  暂无任务，点击&quot;生成任务&quot;开始创建保活任务
                </p>
              </CardContent>
            </Card>
          ) : viewMode === 'calendar' ? (
            <Card>
              <CardHeader>
                <CardTitle>任务日历</CardTitle>
                <CardDescription>
                  共 {filteredTasks.length} 个任务
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CalendarView
                  tasks={sortedTasks.map((task) => {
                    const execDate = new Date(task.exec_date)
                    return {
                      id: task.id,
                      exec_date: execDate.toLocaleDateString('sv-SE'), // YYYY-MM-DD 格式
                      exec_time: execDate.toLocaleTimeString('zh-CN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      }),
                      from_bank_name: getBankName(task.from_bank_id),
                      to_bank_name: getBankName(task.to_bank_id),
                      amount: task.amount,
                      status: task.status,
                    }
                  })}
                  onComplete={(id) => {
                    const task = tasks.find((t) => t.id === id)
                    if (task) handleQuickComplete(task)
                  }}
                  onSkip={(id) => {
                    const task = tasks.find((t) => t.id === id)
                    if (task) handleSkip(task)
                  }}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>任务历史</CardTitle>
                <CardDescription>
                  共 {filteredTasks.length} 个任务
                  {statusFilter !== 'all' &&
                    ` (筛选: ${statusFilter === 'pending' ? '待执行' : statusFilter === 'completed' ? '已完成' : '已跳过'})`}
                  {selectedTasks.size > 0 &&
                    ` · 已选择 ${selectedTasks.size} 个`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='overflow-x-auto'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='w-12'>
                          <Checkbox
                            checked={isAllSelected}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead>周期</TableHead>
                        <TableHead>转出银行</TableHead>
                        <TableHead>转账金额</TableHead>
                        <TableHead>执行日期</TableHead>
                        <TableHead>执行时间</TableHead>
                        <TableHead>收款银行</TableHead>
                        <TableHead>备注</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead className='w-24'>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedTasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedTasks.has(task.id)}
                              onCheckedChange={(checked) =>
                                handleSelectTask(task.id, checked as boolean)
                              }
                            />
                          </TableCell>
                          <TableCell>{getCycleBadge(task.cycle)}</TableCell>
                          <TableCell className='font-medium'>
                            {getBankName(task.from_bank_id)}
                          </TableCell>
                          <TableCell>${task.amount.toFixed(2)}</TableCell>
                          <TableCell>{formatDate(task.exec_date)}</TableCell>
                          <TableCell className='text-muted-foreground'>
                            {formatTime(task.exec_date)}
                          </TableCell>
                          <TableCell>{getBankName(task.to_bank_id)}</TableCell>
                          <TableCell className='text-muted-foreground max-w-[150px]'>
                            <div className='space-y-0.5'>
                              {task.memo && (
                                <div className='truncate' title={task.memo}>
                                  {task.memo}
                                </div>
                              )}
                              {task.notes && (
                                <div
                                  className='truncate text-xs text-blue-600 dark:text-blue-400'
                                  title={task.notes}
                                >
                                  {task.notes}
                                </div>
                              )}
                              {!task.memo && !task.notes && '-'}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(task.status)}</TableCell>
                          <TableCell>
                            <div className='flex gap-1'>
                              {task.status === 'pending' && (
                                <>
                                  <Button
                                    variant='ghost'
                                    size='icon'
                                    className='h-8 w-8 text-green-600'
                                    onClick={() => handleQuickComplete(task)}
                                    title='快速完成'
                                  >
                                    <CheckCircle2 className='h-4 w-4' />
                                  </Button>
                                  <Button
                                    variant='ghost'
                                    size='icon'
                                    className='h-8 w-8 text-blue-600'
                                    onClick={() => openCompleteDialog(task)}
                                    title='完成并添加备注'
                                  >
                                    <FileText className='h-4 w-4' />
                                  </Button>
                                  <Button
                                    variant='ghost'
                                    size='icon'
                                    className='text-muted-foreground h-8 w-8'
                                    onClick={() => handleSkip(task)}
                                    title='跳过'
                                  >
                                    <XCircle className='h-4 w-4' />
                                  </Button>
                                </>
                              )}
                              <Button
                                variant='ghost'
                                size='icon'
                                className='text-destructive h-8 w-8'
                                onClick={() => handleDelete(task)}
                                title='删除'
                              >
                                <Trash2 className='h-4 w-4' />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* 分页控件 */}
                {totalPages > 1 && (
                  <div className='mt-4 flex items-center justify-between border-t pt-4'>
                    <div className='flex items-center gap-2'>
                      <span className='text-muted-foreground text-sm'>
                        每页
                      </span>
                      <Select
                        value={pageSize.toString()}
                        onValueChange={(value) => {
                          setPageSize(parseInt(value))
                          setCurrentPage(1)
                        }}
                      >
                        <SelectTrigger className='w-20'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='10'>10</SelectItem>
                          <SelectItem value='20'>20</SelectItem>
                          <SelectItem value='50'>50</SelectItem>
                          <SelectItem value='100'>100</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className='text-muted-foreground text-sm'>条</span>
                    </div>

                    <div className='flex items-center gap-2'>
                      <span className='text-muted-foreground text-sm'>
                        第 {currentPage} / {totalPages} 页
                      </span>
                      <Button
                        variant='outline'
                        size='icon'
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className='h-4 w-4' />
                      </Button>
                      <Button
                        variant='outline'
                        size='icon'
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className='h-4 w-4' />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </Main>
    </>
  )
}
