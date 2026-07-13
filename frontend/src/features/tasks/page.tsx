import { useState } from 'react'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { ArrowRight, Check, ListChecks, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { TaskStatus } from '@/api/types'
import { accountsQuery } from '@/features/accounts/api'
import { strategiesQuery } from '@/features/strategies/api'
import { formatDateTime, formatMoney } from '@/lib/format'
import { ConfirmDialog } from '@/ui/confirm-dialog'
import { Modal } from '@/ui/modal'
import { PageHeader } from '@/ui/page-header'
import {
  completeTask,
  deleteBatch,
  generateBatch,
  taskBatchesQuery,
  taskKeys,
  tasksQuery,
} from './api'
import { GenerateForm } from './generate-form'

export const TasksPage = () => {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<TaskStatus | ''>('')
  const [batchID, setBatchID] = useState(0)
  const [page, setPage] = useState(1)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [deleteBatchOpen, setDeleteBatchOpen] = useState(false)
  const { data: batches } = useSuspenseQuery(taskBatchesQuery)
  const { data: accounts } = useSuspenseQuery(accountsQuery)
  const { data: strategies } = useSuspenseQuery(strategiesQuery)
  const { data: tasks } = useSuspenseQuery(tasksQuery(status, batchID, page))
  const totalPages = Math.max(1, Math.ceil(tasks.total / tasks.page_size))
  const filtered = status !== '' || batchID > 0

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: taskKeys.all }),
      queryClient.invalidateQueries({ queryKey: taskKeys.batches }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ])
  }
  const generateMutation = useMutation({
    mutationFn: generateBatch,
    onSuccess: async (result) => {
      await refresh()
      setGenerateOpen(false)
      setStatus('')
      setBatchID(result.batch.id)
      setPage(1)
      toast.success(`已生成 ${result.tasks} 项任务`)
    },
    onError: (error) => toast.error(error.message),
  })
  const completeMutation = useMutation({
    mutationFn: completeTask,
    onSuccess: async () => {
      await refresh()
      toast.success('任务已完成')
    },
    onError: (error) => toast.error(error.message),
  })
  const deleteBatchMutation = useMutation({
    mutationFn: deleteBatch,
    onSuccess: async (_, removedID) => {
      if (batchID === removedID) setBatchID(0)
      setDeleteBatchOpen(false)
      await refresh()
      toast.success('任务批次已删除')
    },
    onError: (error) => toast.error(error.message),
  })

  const selectStatus = (value: TaskStatus | '') => {
    setStatus(value)
    setPage(1)
  }
  const selectBatch = (value: number) => {
    setBatchID(value)
    setPage(1)
  }
  const clearFilters = () => {
    setStatus('')
    setBatchID(0)
    setPage(1)
  }

  return (
    <div className='space-y-8'>
      <PageHeader
        title='保活任务'
        description='按批次生成平衡的转入与转出计划，实际完成后再手动标记。'
        actions={
          <button className='button-primary' onClick={() => setGenerateOpen(true)}>
            <Plus size={17} /> 生成任务
          </button>
        }
      />

      <section className='surface overflow-hidden'>
        <div className='grid gap-4 bg-[#faf9f5] p-4 sm:grid-cols-2 lg:grid-cols-[180px_1fr_auto] lg:items-end'>
          <label>
            <span className='label'>任务状态</span>
            <select
              className='field'
              value={status}
              onChange={(event) => selectStatus(event.target.value as TaskStatus | '')}
            >
              <option value=''>全部状态</option>
              <option value='pending'>待执行</option>
              <option value='completed'>已完成</option>
            </select>
          </label>
          <label>
            <span className='label'>任务批次</span>
            <select
              className='field'
              value={batchID}
              onChange={(event) => selectBatch(Number(event.target.value))}
            >
              <option value={0}>全部批次</option>
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  #{batch.id} · {batch.strategy_name} · {batch.group_name || '全部账户'} ·{' '}
                  {batch.task_count} 项
                </option>
              ))}
            </select>
          </label>
          {batchID > 0 ? (
            <button
              type='button'
              className='button-danger'
              disabled={deleteBatchMutation.isPending}
              onClick={() => setDeleteBatchOpen(true)}
            >
              <Trash2 size={16} /> 删除批次
            </button>
          ) : (
            <div className='hidden min-w-24 lg:block' />
          )}
        </div>

        <header className='flex items-center justify-between border-y border-[#e2e6e2] px-5 py-3.5'>
          <div className='flex items-center gap-2.5'>
            <ListChecks size={17} className='text-[#216a55]' />
            <h2 className='text-sm font-semibold text-[#25312c]'>任务清单</h2>
          </div>
          <span className='text-xs text-[#748079]'>共 {tasks.total} 项</span>
        </header>

        {tasks.items.length === 0 ? (
          <div className='px-6 py-16 text-center'>
            <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edf1ed] text-[#77847d]'>
              <ListChecks size={21} />
            </div>
            <p className='mt-4 font-semibold text-[#25312c]'>
              {filtered ? '没有符合筛选条件的任务' : '还没有生成任务'}
            </p>
            <p className='mt-1.5 text-sm text-[#748079]'>
              {filtered ? '换个状态或批次再看看。' : '添加至少两个活跃账户后即可生成。'}
            </p>
            {filtered ? (
              <button className='button-secondary mt-5' onClick={clearFilters}>
                清除筛选
              </button>
            ) : null}
          </div>
        ) : (
          <div className='divide-y divide-[#e7e9e6]'>
            {tasks.items.map((task) => (
              <article
                key={task.id}
                className='grid gap-4 px-5 py-4.5 transition hover:bg-[#fbfaf6] sm:grid-cols-[1fr_auto] sm:items-center'
              >
                <div className='min-w-0'>
                  <div className='flex flex-wrap items-center gap-2.5'>
                    <p className='flex min-w-0 items-center gap-2 text-[15px] font-semibold text-[#25312c]'>
                      <span className='truncate'>{task.from_account_name}</span>
                      <ArrowRight size={15} className='shrink-0 text-[#bd8740]' />
                      <span className='truncate'>{task.to_account_name}</span>
                    </p>
                    <span
                      className={`status-pill ${task.status === 'completed' ? 'bg-[#e7f0eb] text-[#39745f]' : 'bg-[#f5ecdc] text-[#8b642d]'}`}
                    >
                      {task.status === 'completed' ? '已完成' : '待执行'}
                    </span>
                  </div>
                  <div className='mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#748079]'>
                    <span>{formatDateTime(task.scheduled_at)}</span>
                    <span aria-hidden='true'>·</span>
                    <span>第 {task.cycle_no} 周期</span>
                  </div>
                </div>
                <div className='flex items-center justify-between gap-4 sm:justify-end'>
                  <p className='metric-number text-base font-semibold text-[#25312c]'>
                    {formatMoney(task.amount_cents)}
                  </p>
                  {task.status === 'pending' ? (
                    <button
                      className='button-secondary min-h-10 px-3.5 py-2'
                      onClick={() => completeMutation.mutate(task.id)}
                      disabled={completeMutation.isPending}
                    >
                      <Check size={16} /> 标记完成
                    </button>
                  ) : (
                    <p className='text-xs text-[#748079]'>
                      {task.completed_at ? formatDateTime(task.completed_at) : '—'}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {tasks.total > 0 ? (
          <footer className='flex flex-wrap items-center justify-between gap-3 border-t border-[#e2e6e2] bg-[#faf9f5] px-5 py-4 text-sm text-[#68736e]'>
            <span>
              第 {page} / {totalPages} 页
            </span>
            <div className='flex items-center gap-2'>
              <button
                className='button-secondary min-h-9 px-3 py-1.5'
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
              >
                上一页
              </button>
              <button
                className='button-secondary min-h-9 px-3 py-1.5'
                disabled={page * tasks.page_size >= tasks.total}
                onClick={() => setPage((value) => value + 1)}
              >
                下一页
              </button>
            </div>
          </footer>
        ) : null}
      </section>

      <Modal
        open={generateOpen}
        title='生成任务'
        description='选择范围和周期，生成后可以按批次管理。'
        onClose={() => setGenerateOpen(false)}
      >
        <GenerateForm
          accounts={accounts}
          strategies={strategies}
          pending={generateMutation.isPending}
          onSubmit={(input) => generateMutation.mutate(input)}
          onCancel={() => setGenerateOpen(false)}
        />
      </Modal>
      <ConfirmDialog
        open={deleteBatchOpen}
        title={`删除任务批次 #${batchID}`}
        description='这个批次中的所有待办和完成记录都会被永久删除，此操作无法撤销。'
        confirmLabel='删除整个批次'
        pending={deleteBatchMutation.isPending}
        onConfirm={() => deleteBatchMutation.mutate(batchID)}
        onClose={() => setDeleteBatchOpen(false)}
      />
    </div>
  )
}
