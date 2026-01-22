/**
 * 策略管理页面
 */
import { useState } from 'react'
import {
  Calendar,
  CalendarOff,
  Clock,
  DollarSign,
  ListChecks,
  Loader2,
  Pencil,
  Plus,
  Shield,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { PageHeader } from '@/components/page/page-header'
import { Main } from '@/components/layout/main'
import { useRefreshQueries, useStrategies } from '@/hooks/use-queries'
import { strategiesApi } from '@/lib/api'
import type { CreateStrategyRequest, Strategy } from '@/lib/types'

export function Strategies() {
  const { refreshStrategies } = useRefreshQueries()

  // 使用 TanStack Query hooks 加载数据
  const { data: strategies = [], isLoading: loading } = useStrategies()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<CreateStrategyRequest>({
    name: '',
    interval_min: 30,
    interval_max: 60,
    time_start: '09:00',
    time_end: '21:00',
    skip_weekend: false,
    amount_min: 10,
    amount_max: 30,
    daily_limit: 3,
  })

  // 打开新建对话框
  const handleCreate = () => {
    setEditingStrategy(null)
    setFormData({
      name: '',
      interval_min: 30,
      interval_max: 60,
      time_start: '09:00',
      time_end: '21:00',
      skip_weekend: false,
      amount_min: 10,
      amount_max: 30,
      daily_limit: 3,
    })
    setDialogOpen(true)
  }

  // 打开编辑对话框
  const handleEdit = (strategy: Strategy) => {
    if (strategy.is_system) {
      toast.error('系统策略不可修改')
      return
    }
    setEditingStrategy(strategy)
    setFormData({
      name: strategy.name,
      interval_min: strategy.interval_min,
      interval_max: strategy.interval_max,
      time_start: strategy.time_start,
      time_end: strategy.time_end,
      skip_weekend: strategy.skip_weekend,
      amount_min: strategy.amount_min,
      amount_max: strategy.amount_max,
      daily_limit: strategy.daily_limit,
    })
    setDialogOpen(true)
  }

  // 保存策略
  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('请输入策略名称')
      return
    }
    setSaving(true)
    try {
      if (editingStrategy) {
        await strategiesApi.update(editingStrategy.id, formData)
        toast.success('更新成功')
      } else {
        await strategiesApi.create(formData)
        toast.success('创建成功')
      }
      setDialogOpen(false)
      refreshStrategies()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  // 删除策略
  const handleDelete = async (strategy: Strategy) => {
    if (strategy.is_system) {
      toast.error('系统策略不可删除')
      return
    }
    if (!confirm('确定要删除这个策略吗？')) return

    try {
      await strategiesApi.delete(strategy.id)
      toast.success('删除成功')
      refreshStrategies()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败')
    }
  }

  // 分离系统策略和用户策略
  const systemStrategies = strategies.filter((s) => s.is_system)
  const userStrategies = strategies.filter((s) => !s.is_system)

  return (
    <>
      <Main>
        <div className='space-y-6'>
          <PageHeader
            title='策略管理'
            description='管理保活策略，设置执行间隔、金额范围、执行时段等参数'
            actions={
              <>
                <Button onClick={handleCreate} size='sm'>
                  <Plus className='h-4 w-4' />
                  新建策略
                </Button>
              </>
            }
          />

          {/* 策略列表 */}
          {loading ? (
            <div className='space-y-6'>
              {[...Array(2)].map((_, i) => (
                <Card key={i} className='border-border/60 bg-white/80'>
                  <CardHeader>
                    <div className='bg-muted h-5 w-24 animate-pulse rounded' />
                  </CardHeader>
                  <CardContent>
                    <div className='flex gap-4'>
                      {[...Array(2)].map((_, j) => (
                        <div
                          key={j}
                          className='bg-muted h-48 w-64 animate-pulse rounded-lg'
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : strategies.length === 0 ? (
            <Card className='border-border/60 bg-white/80'>
              <CardContent className='text-muted-foreground py-8 text-center'>
                暂无策略，点击"新建策略"创建第一个策略
              </CardContent>
            </Card>
          ) : (
            <div className='space-y-6'>
              {/* 系统策略 */}
              {systemStrategies.length > 0 && (
                <Card className='border-border/60 bg-white/80'>
                  <CardHeader className='pb-3'>
                    <CardTitle className='flex items-center gap-2 text-base'>
                      <div className='rounded bg-blue-500 p-1.5'>
                        <Shield className='h-4 w-4 text-white' />
                      </div>
                      系统策略
                      <Badge variant='secondary' className='ml-2'>
                        {systemStrategies.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='flex flex-wrap gap-4'>
                      {systemStrategies.map((strategy) => (
                        <StrategyCard
                          key={strategy.id}
                          strategy={strategy}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 用户策略 */}
              {userStrategies.length > 0 && (
                <Card className='border-border/60 bg-white/80'>
                  <CardHeader className='pb-3'>
                    <CardTitle className='flex items-center gap-2 text-base'>
                      <div className='rounded bg-green-500 p-1.5'>
                        <ListChecks className='h-4 w-4 text-white' />
                      </div>
                      自定义策略
                      <Badge variant='secondary' className='ml-2'>
                        {userStrategies.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='flex flex-wrap gap-4'>
                      {userStrategies.map((strategy) => (
                        <StrategyCard
                          key={strategy.id}
                          strategy={strategy}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* 新建/编辑对话框 */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className='max-h-[90vh] max-w-lg overflow-y-auto'>
              <DialogHeader>
                <DialogTitle>
                  {editingStrategy ? '编辑策略' : '新建策略'}
                </DialogTitle>
                <DialogDescription>
                  {editingStrategy ? '修改策略参数' : '创建一个新的保活策略'}
                </DialogDescription>
              </DialogHeader>

              <div className='grid gap-4 py-4'>
                {/* 策略名称 */}
                <div className='space-y-2'>
                  <Label htmlFor='name'>策略名称</Label>
                  <Input
                    id='name'
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder='例如：标准保活策略'
                  />
                </div>

                {/* 执行间隔 */}
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='interval_min'>最小间隔（天）</Label>
                    <Input
                      id='interval_min'
                      type='number'
                      min={1}
                      value={formData.interval_min}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          interval_min: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='interval_max'>最大间隔（天）</Label>
                    <Input
                      id='interval_max'
                      type='number'
                      min={1}
                      value={formData.interval_max}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          interval_max: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                  </div>
                </div>

                {/* 金额范围 */}
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='amount_min'>最小金额</Label>
                    <Input
                      id='amount_min'
                      type='number'
                      step='0.01'
                      min={0}
                      value={formData.amount_min}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          amount_min: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='amount_max'>最大金额</Label>
                    <Input
                      id='amount_max'
                      type='number'
                      step='0.01'
                      min={0}
                      value={formData.amount_max}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          amount_max: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>

                {/* 执行时段 */}
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='time_start'>开始时间</Label>
                    <Input
                      id='time_start'
                      type='time'
                      value={formData.time_start}
                      onChange={(e) =>
                        setFormData({ ...formData, time_start: e.target.value })
                      }
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='time_end'>结束时间</Label>
                    <Input
                      id='time_end'
                      type='time'
                      value={formData.time_end}
                      onChange={(e) =>
                        setFormData({ ...formData, time_end: e.target.value })
                      }
                    />
                  </div>
                </div>

                {/* 单日任务上限 */}
                <div className='space-y-2'>
                  <Label htmlFor='daily_limit'>单日任务上限</Label>
                  <Input
                    id='daily_limit'
                    type='number'
                    min={1}
                    value={formData.daily_limit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        daily_limit: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>

                {/* 开关选项 */}
                <div className='flex items-center justify-between rounded-lg border p-4'>
                  <div>
                    <Label>避开周末</Label>
                    <p className='text-muted-foreground text-sm'>
                      任务不会安排在周六、周日执行
                    </p>
                  </div>
                  <Switch
                    checked={formData.skip_weekend}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, skip_weekend: checked })
                    }
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant='outline' onClick={() => setDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className='h-4 w-4 animate-spin' />}
                  保存
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </Main>
    </>
  )
}

// 策略卡片组件
function StrategyCard({
  strategy,
  onEdit,
  onDelete,
}: {
  strategy: Strategy
  onEdit: (strategy: Strategy) => void
  onDelete: (strategy: Strategy) => void
}) {
  return (
    <div
      className={`bg-card flex min-h-[220px] w-64 flex-col rounded-lg border p-5 transition-shadow hover:shadow-md ${
        strategy.is_system
          ? 'border-blue-200 bg-blue-50/30 dark:border-blue-900 dark:bg-blue-950/20'
          : ''
      }`}
    >
      {/* 卡片头部 */}
      <div className='mb-4 flex items-start justify-between'>
        <div className='flex items-center gap-2'>
          <h4 className='font-semibold'>{strategy.name}</h4>
          {strategy.is_system && (
            <Badge variant='secondary' className='text-xs'>
              系统
            </Badge>
          )}
        </div>
        {!strategy.is_system && (
          <div className='flex gap-1'>
            <Button
              variant='ghost'
              size='icon'
              className='h-7 w-7'
              onClick={() => onEdit(strategy)}
            >
              <Pencil className='h-3.5 w-3.5' />
            </Button>
            <Button
              variant='ghost'
              size='icon'
              className='h-7 w-7'
              onClick={() => onDelete(strategy)}
            >
              <Trash2 className='text-destructive h-3.5 w-3.5' />
            </Button>
          </div>
        )}
      </div>

      {/* 卡片内容 */}
      <div className='text-muted-foreground flex-1 space-y-3 text-sm'>
        <div className='flex items-center gap-2'>
          <Calendar className='h-4 w-4' />
          <span>
            间隔: {strategy.interval_min}-{strategy.interval_max} 天
          </span>
        </div>
        <div className='flex items-center gap-2'>
          <DollarSign className='h-4 w-4' />
          <span>
            金额: {strategy.amount_min}-{strategy.amount_max}
          </span>
        </div>
        <div className='flex items-center gap-2'>
          <Clock className='h-4 w-4' />
          <span>
            时段: {strategy.time_start}-{strategy.time_end}
          </span>
        </div>
        <div className='flex items-center gap-2'>
          <ListChecks className='h-4 w-4' />
          <span>上限: {strategy.daily_limit} 笔/天</span>
        </div>
      </div>

      {/* 标签 */}
      <div className='mt-4 flex flex-wrap gap-1.5 border-t pt-3'>
        {strategy.skip_weekend && (
          <Badge variant='outline' className='text-xs'>
            <CalendarOff className='mr-1 h-3 w-3' />
            避开周末
          </Badge>
        )}
        {!strategy.skip_weekend && (
          <span className='text-muted-foreground text-xs'>包含周末</span>
        )}
      </div>
    </div>
  )
}
