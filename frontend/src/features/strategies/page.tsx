import { useState } from 'react'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { CalendarClock, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Strategy, StrategyInput } from '@/api/types'
import { formatMoney, minutesToTime } from '@/lib/format'
import { ConfirmDialog } from '@/ui/confirm-dialog'
import { Modal } from '@/ui/modal'
import { PageHeader } from '@/ui/page-header'
import {
  createStrategy,
  deleteStrategy,
  strategiesQuery,
  strategyKeys,
  updateStrategy,
} from './api'
import { StrategyForm } from './strategy-form'

export const StrategiesPage = () => {
  const { data: strategies } = useSuspenseQuery(strategiesQuery)
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Strategy | undefined>()
  const [deleting, setDeleting] = useState<Strategy | undefined>()
  const [formOpen, setFormOpen] = useState(false)
  const refresh = () => queryClient.invalidateQueries({ queryKey: strategyKeys.all })
  const saveMutation = useMutation({
    mutationFn: (input: StrategyInput) =>
      editing ? updateStrategy(editing.id, input) : createStrategy(input),
    onSuccess: async () => {
      await refresh()
      setFormOpen(false)
      setEditing(undefined)
      toast.success('策略已保存')
    },
    onError: (error) => toast.error(error.message),
  })
  const deleteMutation = useMutation({
    mutationFn: deleteStrategy,
    onSuccess: async () => {
      await refresh()
      setDeleting(undefined)
      toast.success('策略已删除，历史批次仍保留策略名称')
    },
    onError: (error) => toast.error(error.message),
  })

  const openCreate = () => {
    setEditing(undefined)
    setFormOpen(true)
  }
  return (
    <div className='space-y-8'>
      <PageHeader
        title='保活策略'
        description='用一组清楚的规则决定任务间隔、执行时段、金额范围和每日数量。'
        actions={
          <button className='button-primary' onClick={openCreate}>
            <Plus size={17} /> 新建策略
          </button>
        }
      />

      {strategies.length === 0 ? (
        <section className='surface grid min-h-80 place-items-center px-6 py-14 text-center'>
          <div>
            <div className='mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e4f0ea] text-[#216a55]'>
              <CalendarClock size={25} />
            </div>
            <h2 className='mt-5 text-lg font-semibold text-[#18231f]'>还没有可用策略</h2>
            <p className='mx-auto mt-2 max-w-sm text-sm leading-6 text-[#68736e]'>
              创建策略后，就能按自己的节奏安排账户保活任务。
            </p>
            <button className='button-primary mt-6' onClick={openCreate}>
              <Plus size={17} /> 创建策略
            </button>
          </div>
        </section>
      ) : (
        <div className='grid gap-4 md:grid-cols-2 2xl:grid-cols-3'>
          {strategies.map((strategy) => (
            <article
              key={strategy.id}
              className='surface group relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:border-[#bdc9c2] hover:shadow-[0_12px_30px_rgba(24,35,31,0.07)]'
            >
              <div className='absolute inset-x-0 top-0 h-1 bg-[#216a55]' />
              <div className='flex items-start justify-between gap-3 pt-1'>
                <div className='flex min-w-0 items-center gap-3'>
                  <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e4f0ea] text-[#216a55]'>
                    <CalendarClock size={19} />
                  </div>
                  <div className='min-w-0'>
                    <h2 className='truncate font-semibold text-[#1f2c26]'>{strategy.name}</h2>
                    <p className='mt-0.5 text-xs text-[#748079]'>
                      每日最多 {strategy.daily_limit} 项
                    </p>
                  </div>
                </div>
                <div className='flex gap-0.5'>
                  <button
                    type='button'
                    className='icon-button'
                    onClick={() => {
                      setEditing(strategy)
                      setFormOpen(true)
                    }}
                    aria-label={`编辑策略 ${strategy.name}`}
                    title='编辑'
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type='button'
                    className='icon-button-danger'
                    onClick={() => setDeleting(strategy)}
                    disabled={deleteMutation.isPending}
                    aria-label={`删除策略 ${strategy.name}`}
                    title='删除'
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <dl className='mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#e0e4e0] bg-[#e0e4e0]'>
                <Info
                  label='计划间隔'
                  value={`${strategy.interval_min_days}–${strategy.interval_max_days} 天`}
                />
                <Info
                  label='执行时段'
                  value={`${minutesToTime(strategy.time_start_minutes)}–${minutesToTime(strategy.time_end_minutes)}`}
                />
                <Info
                  label='金额范围'
                  value={`${formatMoney(strategy.amount_min_cents)}–${formatMoney(strategy.amount_max_cents)}`}
                />
                <Info label='周末规则' value={strategy.skip_weekends ? '跳过周末' : '周末可安排'} />
              </dl>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={formOpen}
        title={editing ? '编辑策略' : '新建策略'}
        description='所有规则只用于生成本地计划。'
        onClose={() => setFormOpen(false)}
      >
        <StrategyForm
          key={editing?.id ?? 'new'}
          strategy={editing}
          pending={saveMutation.isPending}
          onSubmit={(input) => saveMutation.mutate(input)}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>
      <ConfirmDialog
        open={Boolean(deleting)}
        title={`删除“${deleting?.name ?? ''}”`}
        description='删除策略不会删除已有任务批次，但之后将无法再用这套规则生成新任务。'
        confirmLabel='删除策略'
        pending={deleteMutation.isPending}
        onConfirm={() => {
          if (deleting) deleteMutation.mutate(deleting.id)
        }}
        onClose={() => setDeleting(undefined)}
      />
    </div>
  )
}

const Info = ({ label, value }: { label: string; value: string }) => (
  <div className='bg-[#faf9f5] px-3.5 py-3'>
    <dt className='text-[11px] font-medium text-[#7a857f]'>{label}</dt>
    <dd className='metric-number mt-1 text-xs font-semibold text-[#33413b]'>{value}</dd>
  </div>
)
