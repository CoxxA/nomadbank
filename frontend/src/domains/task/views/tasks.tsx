/**
 * 任务管理页面 - 任务历史日志
 */
import { useEffect, useRef, useState } from 'react'
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Filter,
  Loader2,
  MoreHorizontal,
  Plus,
  Search as SearchIcon,
  SkipForward,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/handle-server-error'
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
import { PageHeader } from '@/components/page/page-header'
import { Main } from '@/components/layout/main'
import { useBankGroups } from '@/domains/bank/hooks'
import { useTaskCycles, useTasks } from '@/domains/task/hooks'
import { useStrategies } from '@/domains/strategy/hooks'
import { tasksApi } from '@/domains/task/api'
import { useRefreshQueries } from '@/hooks/use-queries'
import { parseDateKey } from '@/lib/utils'
import type { CompleteTaskRequest, Task } from '@/domains/task/types'

export function Tasks() {
  const { refreshTasks } = useRefreshQueries()

  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [generateForm, setGenerateForm] = useState({
    strategy_id: '',
    cycles: 4,
    group: '', // 空字符串表示全部
  })
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [groupFilter, setGroupFilter] = useState('all')
  const [cycleFilter, setCycleFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  // 完成任务对话框
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [completingTask, setCompletingTask] = useState<Task | null>(null)
  const [completeNotes, setCompleteNotes] = useState('')
  const [completing, setCompleting] = useState(false)

  // 使用 TanStack Query hooks 加载数据（自动缓存）
  const { data: tasksPage, isLoading: tasksLoading } = useTasks({
    page: currentPage,
    page_size: pageSize,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    cycle: cycleFilter !== 'all' ? Number(cycleFilter) : undefined,
    group: groupFilter !== 'all' ? groupFilter : undefined,
    q: searchQuery.trim() || undefined,
  })
  const { data: strategies = [] } = useStrategies()
  const { data: cyclesData } = useTaskCycles()
  const { data: groupsData } = useBankGroups()

  const cycles = cyclesData?.cycles || []
  const groups = groupsData?.groups || []
  const loading = tasksLoading
  const tasks = tasksPage?.items ?? []
  const totalTasks = tasksPage?.total ?? 0

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
      handleApiError(error, '操作失败')
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
      handleApiError(error, '操作失败')
    }
  }

  // 跳过任务
  const handleSkip = async (task: Task) => {
    try {
      await tasksApi.skip(task.id)
      toast.success('任务已跳过')
      refreshTasks()
    } catch (error) {
      handleApiError(error, '操作失败')
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
      handleApiError(error, '删除失败')
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
      handleApiError(error, '删除失败')
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
    } finally {
      setGenerating(false)
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      toast.warning('导入功能暂不支持')
    } finally {
      setImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      toast.warning('导出功能暂不支持')
    } finally {
      setExporting(false)
    }
  }

  // 分页
  const totalPages = Math.ceil(totalTasks / pageSize)
  const paginatedTasks = tasks

  // 当筛选条件改变时重置页码
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, searchQuery, groupFilter, cycleFilter])

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
    const date = parseDateKey(dateStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}/${month}/${day}`
  }

  // 格式化时间（从完整日期时间中提取）
  const formatTime = (dateStr: string, execTime?: string) => {
    if (execTime) return execTime
    const date = new Date(dateStr)
    if (Number.isNaN(date.getTime())) return '-'
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
          <PageHeader
            title='任务管理'
            description='筛选任务状态、快速执行与管理任务历史'
            actions={
              <>
                <input
                  ref={fileInputRef}
                  type='file'
                  accept='.csv'
                  className='hidden'
                  onChange={handleImport}
                />
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                >
                  {importing ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    <Upload className='h-4 w-4' />
                  )}
                  导入
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleExport}
                  disabled={exporting}
                >
                  {exporting ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    <Download className='h-4 w-4' />
                  )}
                  导出
                </Button>
                <Button onClick={handleOpenGenerateDialog} size='sm'>
                  <Plus className='h-4 w-4' />
                  生成任务
                </Button>
              </>
            }
          />

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
                  {generating && <Loader2 className='h-4 w-4 animate-spin' />}
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
                      {completingTask.from_bank?.name || '-'} →{' '}
                      {completingTask.to_bank?.name || '-'}
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
                  {completing && <Loader2 className='h-4 w-4 animate-spin' />}
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
          ) : (
            <Card className='border-border/60 bg-white/80'>
              <CardHeader className='space-y-4'>
                <div>
                  <CardTitle className='text-base'>任务历史</CardTitle>
                  <CardDescription>
                    共 {totalTasks} 个任务
                    {selectedTasks.size > 0 &&
                      ` · 已选择 ${selectedTasks.size} 个`}
                  </CardDescription>
                </div>

                <div className='flex flex-col gap-3 lg:flex-row lg:items-center'>
                  <div className='relative w-full lg:w-72'>
                    <SearchIcon className='text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4' />
                  <Input
                    placeholder='搜索银行、备注、金额...'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className='w-full pl-8'
                  />
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger className='w-full lg:w-36'>
                    <Filter className='mr-2 h-4 w-4' />
                    <SelectValue placeholder='状态' />
                  </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>全部状态</SelectItem>
                      <SelectItem value='pending'>待执行</SelectItem>
                      <SelectItem value='completed'>已完成</SelectItem>
                      <SelectItem value='skipped'>已跳过</SelectItem>
                    </SelectContent>
                  </Select>
                <Select
                  value={cycleFilter}
                  onValueChange={setCycleFilter}
                >
                  <SelectTrigger className='w-full lg:w-36'>
                    <SelectValue placeholder='周期' />
                  </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>全部周期</SelectItem>
                      {cycles.map((cycle) => (
                        <SelectItem key={cycle} value={cycle.toString()}>
                          周期 {cycle}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                <Select
                  value={groupFilter}
                  onValueChange={setGroupFilter}
                >
                  <SelectTrigger className='w-full lg:w-44'>
                    <SelectValue placeholder='分组' />
                  </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>全部分组</SelectItem>
                      <SelectItem value='ungrouped'>未分组</SelectItem>
                      {groups.map((group) => (
                        <SelectItem key={group} value={group}>
                          {group}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedTasks.size > 0 && (
                  <div className='flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm'>
                    <Badge variant='default' className='rounded-lg'>
                      {selectedTasks.size}
                    </Badge>
                    <span className='text-muted-foreground'>已选择</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant='outline' size='sm' disabled={deleting}>
                          {deleting ? (
                            <Loader2 className='h-4 w-4 animate-spin' />
                          ) : (
                            <Trash2 className='h-4 w-4' />
                          )}
                          批量删除
                          <ChevronDown className='h-4 w-4' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end' className='w-52'>
                        <DropdownMenuItem
                          onClick={() => handleBatchDelete('selected')}
                        >
                          删除选中 ({selectedTasks.size})
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleBatchDelete('completed')}
                        >
                          删除已完成
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {cycles.length > 0 && (
                          <>
                            <DropdownMenuLabel className='text-xs'>
                              按周期删除
                            </DropdownMenuLabel>
                            {cycles.map((cycle) => (
                              <DropdownMenuItem
                                key={cycle}
                                onClick={() => handleBatchDelete(cycle)}
                              >
                                周期 {cycle}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleBatchDelete('all')}
                          className='text-destructive focus:text-destructive'
                        >
                          删除全部
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => setSelectedTasks(new Set())}
                    >
                      清除选择
                    </Button>
                  </div>
                )}
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
                        <TableHead className='w-20 text-right'>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedTasks.map((task) => (
                        <TableRow key={task.id} className='group'>
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
                            {task.from_bank?.name || '-'}
                          </TableCell>
                          <TableCell>${task.amount.toFixed(2)}</TableCell>
                          <TableCell>{formatDate(task.exec_date)}</TableCell>
                          <TableCell className='text-muted-foreground'>
                            {formatTime(task.exec_date, task.exec_time)}
                          </TableCell>
                          <TableCell>{task.to_bank?.name || '-'}</TableCell>
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
                          <TableCell className='text-right'>
                            <div className='inline-flex items-center gap-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100'>
                              {task.status === 'pending' ? (
                                <TooltipProvider delayDuration={0}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant='ghost'
                                        size='icon'
                                        className='h-8 w-8 text-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950'
                                        onClick={() => handleQuickComplete(task)}
                                      >
                                        <CheckCircle2 className='h-4 w-4' />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side='top'>
                                      完成
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <div className='h-8 w-8' />
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant='ghost'
                                    size='icon'
                                    className='h-8 w-8'
                                  >
                                    <MoreHorizontal className='h-4 w-4' />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align='end'>
                                  {task.status === 'pending' && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() => openCompleteDialog(task)}
                                      >
                                        <CheckCircle2 className='mr-2 h-4 w-4' />
                                        完成并添加备注
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleSkip(task)}
                                      >
                                        <SkipForward className='mr-2 h-4 w-4' />
                                        跳过任务
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                    </>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(task)}
                                    className='text-destructive focus:text-destructive'
                                  >
                                    <Trash2 className='mr-2 h-4 w-4' />
                                    删除
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className='mt-4 flex flex-col items-start justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center'>
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
