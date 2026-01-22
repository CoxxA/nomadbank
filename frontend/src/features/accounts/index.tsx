/**
 * 银行管理页面
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search as SearchIcon,
  Trash2,
  Upload,
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
import { Combobox } from '@/components/ui/combobox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { MetricCard } from '@/components/page/metric-card'
import { PageHeader } from '@/components/page/page-header'
import { Main } from '@/components/layout/main'
import {
  useBankGroups,
  useBanksWithNextTasks,
  useRefreshQueries,
} from '@/hooks/use-queries'
import { banksApi, importExportApi } from '@/lib/api'
import { parseDateKey } from '@/lib/utils'
import type { BankWithNextTask, CreateBankRequest } from '@/lib/types'
import { getAccountsSummary } from '@/features/accounts/summary'

export function Accounts() {
  const { refreshBanks } = useRefreshQueries()

  // 使用 TanStack Query hooks 加载数据（自动缓存）
  const {
    data: banks = [],
    isLoading: banksLoading,
    refetch,
  } = useBanksWithNextTasks()
  const { data: groupsData } = useBankGroups()
  // 页面切换时强制刷新数据
  useEffect(() => {
    refetch()
  }, [refetch])

  const groups = groupsData?.groups || []
  const loading = banksLoading

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBank, setEditingBank] = useState<BankWithNextTask | null>(null)
  const [formData, setFormData] = useState<CreateBankRequest>({
    name: '',
    group_name: '',
    is_active: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [groupFilter, setGroupFilter] = useState('all')
  const [selectedBanks, setSelectedBanks] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [moveGroupDialogOpen, setMoveGroupDialogOpen] = useState(false)
  const [selectedMoveGroup, setSelectedMoveGroup] = useState<string>('')
  const [movingGroup, setMovingGroup] = useState(false)
  // 打开新增对话框
  const handleAdd = () => {
    setEditingBank(null)
    setFormData({
      name: '',
      group_name: '',
      is_active: true,
    })
    setDialogOpen(true)
  }

  // 打开编辑对话框
  const handleEdit = (bank: BankWithNextTask) => {
    setEditingBank(bank)
    setFormData({
      name: bank.name,
      group_name: bank.group_name || '',
      is_active: bank.is_active,
    })
    setDialogOpen(true)
  }

  // 删除银行
  const handleDelete = async (bank: BankWithNextTask) => {
    if (!confirm(`确定要删除 "${bank.name}" 吗？`)) return

    try {
      await banksApi.delete(bank.id)
      toast.success('删除成功')
      refreshBanks()
    } catch (error) {
      toast.error('删除失败')
      console.error(error)
    }
  }

  // 批量删除
  const handleBatchDelete = async (type: 'selected' | 'inactive' | 'all') => {
    let confirmMessage = ''
    if (type === 'selected') {
      if (selectedBanks.size === 0) {
        toast.error('请先选择要删除的银行')
        return
      }
      confirmMessage = `确定要删除选中的 ${selectedBanks.size} 个银行吗？`
    } else if (type === 'inactive') {
      confirmMessage = '确定要删除所有停用的银行吗？'
    } else if (type === 'all') {
      confirmMessage = '确定要删除全部银行吗？此操作不可恢复！'
    }

    if (!confirm(confirmMessage)) return

    setDeleting(true)
    try {
      let result
      if (type === 'selected') {
        result = await banksApi.batchDelete({
          bank_ids: Array.from(selectedBanks),
        })
      } else if (type === 'inactive') {
        result = await banksApi.batchDelete({ delete_inactive: true })
      } else {
        result = await banksApi.batchDelete({ delete_all: true })
      }
      toast.success(result.message)
      setSelectedBanks(new Set())
      refreshBanks()
    } catch (error) {
      toast.error('删除失败')
      console.error(error)
    } finally {
      setDeleting(false)
    }
  }

  // 打开批量移动分组对话框
  const openMoveGroupDialog = () => {
    if (selectedBanks.size === 0) {
      toast.error('请先选择要移动的银行')
      return
    }
    setSelectedMoveGroup('')
    setMoveGroupDialogOpen(true)
  }

  // 批量移动分组
  const handleBatchMoveGroup = async () => {
    if (selectedBanks.size === 0) return

    setMovingGroup(true)
    try {
      const result = await banksApi.batchUpdateGroup({
        bank_ids: Array.from(selectedBanks),
        group_name: selectedMoveGroup || null,
      })
      toast.success(result.message)
      setSelectedBanks(new Set())
      setMoveGroupDialogOpen(false)
      refreshBanks()
    } catch (error) {
      toast.error('移动分组失败')
      console.error(error)
    } finally {
      setMovingGroup(false)
    }
  }

  // 全选/取消全选（当前页）
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedBanks(new Set(paginatedBanks.map((b) => b.id)))
    } else {
      setSelectedBanks(new Set())
    }
  }

  // 选择单个银行
  const handleSelectBank = (bankId: string, checked: boolean) => {
    const newSelected = new Set(selectedBanks)
    if (checked) {
      newSelected.add(bankId)
    } else {
      newSelected.delete(bankId)
    }
    setSelectedBanks(newSelected)
  }

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const submitData = {
        ...formData,
        group_name: formData.group_name || undefined,
        strategy_id: formData.strategy_id || undefined,
      }

      if (editingBank) {
        await banksApi.update(editingBank.id, submitData)
        toast.success('更新成功')
      } else {
        await banksApi.create(submitData)
        toast.success('添加成功')
      }
      setDialogOpen(false)
      refreshBanks()
    } catch (error) {
      toast.error(editingBank ? '更新失败' : '添加失败')
      console.error(error)
    } finally {
      setSubmitting(false)
    }
  }

  // 导入银行列表
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      const result = await importExportApi.importBanks(file)
      if (result.error_count > 0) {
        toast.warning(
          `导入完成: 成功 ${result.success_count} 条，失败 ${result.error_count} 条`
        )
        if (result.errors.length > 0) {
          console.error('导入错误:', result.errors)
        }
      } else {
        toast.success(`导入成功: ${result.success_count} 条记录`)
      }
      refreshBanks()
    } catch (error) {
      toast.error('导入失败')
      console.error(error)
    } finally {
      setImporting(false)
      // 重置 file input
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

  const summary = useMemo(() => getAccountsSummary(banks), [banks])
  const groupCount = useMemo(
    () => new Set(banks.map((bank) => bank.group_name).filter(Boolean)).size,
    [banks]
  )
  const ungroupedCount = useMemo(
    () => banks.filter((bank) => !bank.group_name).length,
    [banks]
  )

  // 格式化日期
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    return parseDateKey(dateStr).toLocaleDateString('zh-CN')
  }

  // 格式化时间
  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '-'
    return timeStr.slice(0, 5) // 只显示 HH:MM
  }

  // 搜索过滤
  const filteredBanks = banks.filter((bank) => {
    if (statusFilter === 'active' && !bank.is_active) return false
    if (statusFilter === 'inactive' && bank.is_active) return false
    if (groupFilter !== 'all') {
      if (groupFilter === 'ungrouped') {
        if (bank.group_name) return false
      } else if (bank.group_name !== groupFilter) {
        return false
      }
    }
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      bank.name.toLowerCase().includes(query) ||
      (bank.group_name || '').toLowerCase().includes(query)
    )
  })

  // 分页
  const totalPages = Math.ceil(filteredBanks.length / pageSize)
  const paginatedBanks = filteredBanks.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  // 当搜索条件改变时重置页码
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, groupFilter])

  const isAllSelected =
    paginatedBanks.length > 0 && selectedBanks.size === paginatedBanks.length

  return (
    <>
      <Main>
        <div className='space-y-6'>
          <PageHeader
            title='银行管理'
            description='管理银行账户、分组与下次转账计划'
            actions={
              <div className='flex flex-wrap gap-2'>
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
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  ) : (
                    <Upload className='mr-2 h-4 w-4' />
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
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  ) : (
                    <Download className='mr-2 h-4 w-4' />
                  )}
                  导出
                </Button>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size='sm' onClick={handleAdd}>
                      <Plus className='mr-2 h-4 w-4' />
                      添加银行
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <form onSubmit={handleSubmit}>
                      <DialogHeader>
                        <DialogTitle>
                          {editingBank ? '编辑银行' : '添加银行'}
                        </DialogTitle>
                        <DialogDescription>
                          {editingBank
                            ? '修改银行信息'
                            : '添加一个新的银行账户'}
                        </DialogDescription>
                      </DialogHeader>
                      <div className='grid gap-4 py-4'>
                        <div className='space-y-2'>
                          <Label htmlFor='name'>银行名称 *</Label>
                          <Input
                            id='name'
                            placeholder='例如：中银 BOC(HK)'
                            value={formData.name}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                name: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                        <div className='space-y-2'>
                          <Label htmlFor='group_name'>分组</Label>
                          <Combobox
                            value={formData.group_name || ''}
                            onValueChange={(value) =>
                              setFormData({
                                ...formData,
                                group_name: value,
                              })
                            }
                            options={groups}
                            placeholder='例如：香港银行、父母账户、朋友账户'
                            emptyText='无匹配分组'
                            allowCustom={true}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          type='button'
                          variant='outline'
                          onClick={() => setDialogOpen(false)}
                        >
                          取消
                        </Button>
                        <Button type='submit' disabled={submitting}>
                          {submitting && (
                            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                          )}
                          {editingBank ? '保存' : '添加'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            }
          />

          <div className='grid gap-2 md:grid-cols-2 xl:grid-cols-4'>
            <MetricCard
              label='总银行数'
              value={summary.total}
              description={`启用 ${summary.active} · 停用 ${summary.inactive}`}
              size='compact'
            />
            <MetricCard
              label='启用银行'
              value={summary.active}
              description={
                summary.total
                  ? `启用率 ${Math.round(
                      (summary.active / summary.total) * 100
                    )}%`
                  : '暂无银行'
              }
              size='compact'
            />
            <MetricCard
              label='分组数量'
              value={groupCount}
              description={`未分组 ${ungroupedCount}`}
              size='compact'
            />
            <MetricCard
              label='下一次转账'
              value={
                summary.nextTransfer
                  ? formatDate(summary.nextTransfer.date)
                  : '暂无'
              }
              description={
                summary.nextTransfer
                  ? [
                      summary.nextTransfer.time
                        ? formatTime(summary.nextTransfer.time)
                        : null,
                      summary.nextTransfer.toBank || null,
                      summary.nextTransfer.amount !== undefined
                        ? `$${summary.nextTransfer.amount.toFixed(2)}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : '暂无待转账'
              }
              size='compact'
            />
          </div>

          <Card className='border-border/60 bg-white/80 py-4 gap-4'>
            <CardHeader className='space-y-3 px-4 pb-4'>
              <div className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
                <div>
                  <CardTitle>银行列表</CardTitle>
                  <CardDescription>
                    共 {filteredBanks.length} 个银行
                    {selectedBanks.size > 0 &&
                      ` · 已选择 ${selectedBanks.size} 个`}
                  </CardDescription>
                </div>
              </div>

              <div className='flex flex-col gap-3 lg:flex-row lg:items-center'>
                <div className='relative w-full lg:w-72'>
                  <SearchIcon className='text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4' />
                  <Input
                    placeholder='搜索银行或分组...'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className='h-9 w-full pl-8 text-sm'
                  />
                </div>
                <Select
                  value={groupFilter}
                  onValueChange={(value) => setGroupFilter(value)}
                >
                  <SelectTrigger className='h-9 w-full lg:w-48 text-sm'>
                    <SelectValue placeholder='全部分组' />
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
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value)}
                >
                  <SelectTrigger className='h-9 w-full lg:w-40 text-sm'>
                    <SelectValue placeholder='全部状态' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>全部状态</SelectItem>
                    <SelectItem value='active'>启用</SelectItem>
                    <SelectItem value='inactive'>停用</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedBanks.size > 0 && (
                <div className='flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm'>
                  <Badge variant='default' className='rounded-lg'>
                    {selectedBanks.size}
                  </Badge>
                  <span className='text-muted-foreground'>已选择</span>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={openMoveGroupDialog}
                    disabled={movingGroup}
                  >
                    {movingGroup ? (
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    ) : (
                      <ChevronRight className='mr-2 h-4 w-4' />
                    )}
                    移动分组
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant='outline' size='sm' disabled={deleting}>
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
                      >
                        删除选中 ({selectedBanks.size})
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleBatchDelete('inactive')}
                      >
                        删除停用的
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleBatchDelete('all')}
                        className='text-destructive'
                      >
                        删除全部
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => setSelectedBanks(new Set())}
                  >
                    清除选择
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className='px-4'>
              {loading ? (
                <div className='flex items-center justify-center py-10'>
                  <Loader2 className='text-muted-foreground h-8 w-8 animate-spin' />
                </div>
              ) : banks.length === 0 ? (
                <div className='text-muted-foreground py-10 text-center'>
                  暂无银行账户，点击&quot;添加银行&quot;开始添加
                </div>
              ) : (
                <>
                  <div className='overflow-x-auto'>
                    <Table className='text-[13px] [&_th]:h-9 [&_th]:py-1 [&_td]:py-1.5 [&_td]:px-2'>
                      <TableHeader>
                        <TableRow>
                          <TableHead className='w-12'>
                            <Checkbox
                              checked={isAllSelected}
                              onCheckedChange={handleSelectAll}
                            />
                          </TableHead>
                          <TableHead>银行名称</TableHead>
                          <TableHead>分组</TableHead>
                          <TableHead>下次执行日期</TableHead>
                          <TableHead>下次执行时间</TableHead>
                          <TableHead>收款银行</TableHead>
                          <TableHead>金额</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead className='w-12'></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedBanks.map((bank) => {
                          return (
                            <TableRow key={bank.id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedBanks.has(bank.id)}
                                  onCheckedChange={(checked) =>
                                    handleSelectBank(
                                      bank.id,
                                      checked as boolean
                                    )
                                  }
                                />
                              </TableCell>
                              <TableCell className='font-medium'>
                                {bank.name}
                              </TableCell>
                              <TableCell>
                                {bank.group_name ? (
                                  <Badge variant='outline'>
                                    {bank.group_name}
                                  </Badge>
                                ) : (
                                  <span className='text-muted-foreground'>
                                    -
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {formatDate(bank.next_exec_date)}
                              </TableCell>
                              <TableCell>
                                {formatTime(bank.next_exec_time)}
                              </TableCell>
                              <TableCell>
                                {bank.next_to_bank_name || '-'}
                              </TableCell>
                              <TableCell>
                                {bank.next_amount
                                  ? `$${bank.next_amount.toFixed(2)}`
                                  : '-'}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    bank.is_active ? 'default' : 'secondary'
                                  }
                                >
                                  {bank.is_active ? '启用' : '停用'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant='ghost' size='icon'>
                                      <MoreHorizontal className='h-4 w-4' />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align='end'>
                                    <DropdownMenuItem
                                      onClick={() => handleEdit(bank)}
                                    >
                                      <Pencil className='mr-2 h-4 w-4' />
                                      编辑
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className='text-destructive'
                                      onClick={() => handleDelete(bank)}
                                    >
                                      <Trash2 className='mr-2 h-4 w-4' />
                                      删除
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          )
                        })}
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
                        <span className='text-muted-foreground text-sm'>
                          条
                        </span>
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
                </>
              )}
            </CardContent>
          </Card>
          <Dialog
            open={moveGroupDialogOpen}
            onOpenChange={setMoveGroupDialogOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>移动到分组</DialogTitle>
                <DialogDescription>
                  将选中的 {selectedBanks.size} 个银行移动到指定分组
                </DialogDescription>
              </DialogHeader>
              <div className='py-4'>
                <div className='space-y-2'>
                  <Label>目标分组</Label>
                  <Combobox
                    value={selectedMoveGroup}
                    onValueChange={setSelectedMoveGroup}
                    options={groups}
                    placeholder='选择或输入分组名称'
                    emptyText='无匹配分组，可直接输入新分组名'
                    allowCustom={true}
                  />
                  <p className='text-muted-foreground text-xs'>留空则移除分组</p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setMoveGroupDialogOpen(false)}
                >
                  取消
                </Button>
                <Button onClick={handleBatchMoveGroup} disabled={movingGroup}>
                  {movingGroup && (
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  )}
                  确认移动
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </Main>
    </>
  )
}
