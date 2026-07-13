import { useState } from 'react'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { Pencil, Plus, Power, Trash2, WalletCards } from 'lucide-react'
import { toast } from 'sonner'
import type { Account, AccountInput } from '@/api/types'
import { ConfirmDialog } from '@/ui/confirm-dialog'
import { Modal } from '@/ui/modal'
import { PageHeader } from '@/ui/page-header'
import { AccountForm } from './account-form'
import { accountKeys, accountsQuery, createAccount, deleteAccount, updateAccount } from './api'

export const AccountsPage = () => {
  const { data: accounts } = useSuspenseQuery(accountsQuery)
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Account | undefined>()
  const [deleting, setDeleting] = useState<Account | undefined>()
  const [formOpen, setFormOpen] = useState(false)
  const activeCount = accounts.filter((account) => account.active).length

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: accountKeys.all })
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }
  const saveMutation = useMutation({
    mutationFn: (input: AccountInput) =>
      editing ? updateAccount(editing.id, input) : createAccount(input),
    onSuccess: async () => {
      await refresh()
      setFormOpen(false)
      setEditing(undefined)
      toast.success('账户已保存')
    },
    onError: (error) => toast.error(error.message),
  })
  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: async () => {
      await refresh()
      setDeleting(undefined)
      toast.success('账户已删除')
    },
    onError: (error) => toast.error(error.message),
  })
  const toggleMutation = useMutation({
    mutationFn: (account: Account) =>
      updateAccount(account.id, {
        name: account.name,
        group_name: account.group_name,
        active: !account.active,
      }),
    onSuccess: refresh,
    onError: (error) => toast.error(error.message),
  })

  const openCreate = () => {
    setEditing(undefined)
    setFormOpen(true)
  }
  const openEdit = (account: Account) => {
    setEditing(account)
    setFormOpen(true)
  }
  return (
    <div className='space-y-8'>
      <PageHeader
        title='银行账户'
        description='只记录账户名称与计划关系，不读取余额，也不会发起真实转账。'
        actions={
          <button className='button-primary' type='button' onClick={openCreate}>
            <Plus size={17} /> 新建账户
          </button>
        }
      />

      {accounts.length === 0 ? (
        <section className='surface overflow-hidden'>
          <div className='grid min-h-80 place-items-center px-6 py-14 text-center'>
            <div>
              <div className='mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e4f0ea] text-[#216a55]'>
                <WalletCards size={25} />
              </div>
              <h2 className='mt-5 text-lg font-semibold tracking-[-0.02em] text-[#18231f]'>
                从第一个账户开始
              </h2>
              <p className='mx-auto mt-2 max-w-sm text-sm leading-6 text-[#68736e]'>
                至少添加两个账户，NomadBank 才能生成平衡的转入与转出计划。
              </p>
              <button className='button-primary mt-6' onClick={openCreate}>
                <Plus size={17} /> 添加账户
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className='surface overflow-hidden'>
          <header className='flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e6e2] bg-[#faf9f5] px-5 py-4'>
            <div>
              <h2 className='text-sm font-semibold text-[#25312c]'>账户清单</h2>
              <p className='mt-0.5 text-xs text-[#748079]'>
                {activeCount} 个活跃 · {accounts.length - activeCount} 个停用
              </p>
            </div>
            <span className='status-pill bg-[#e4f0ea] text-[#216a55]'>共 {accounts.length} 个</span>
          </header>
          <div className='divide-y divide-[#e5e8e4]'>
            {accounts.map((account) => (
              <article
                key={account.id}
                className='group flex flex-col gap-4 px-5 py-4.5 transition hover:bg-[#fbfaf6] sm:flex-row sm:items-center sm:justify-between'
              >
                <div className='flex min-w-0 items-center gap-3.5'>
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${account.active ? 'bg-[#e4f0ea] text-[#216a55]' : 'bg-[#eeefeb] text-[#8b9590]'}`}
                  >
                    <WalletCards size={19} />
                  </div>
                  <div className='min-w-0'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <h2 className='truncate text-[15px] font-semibold text-[#25312c]'>
                        {account.name}
                      </h2>
                      <span
                        className={`status-pill px-2 py-0.5 ${account.active ? 'bg-[#e9f2ed] text-[#39745f]' : 'bg-[#eff0ed] text-[#717b76]'}`}
                      >
                        {account.active ? '参与计划' : '已停用'}
                      </span>
                    </div>
                    <p className='mt-1 text-sm text-[#748079]'>{account.group_name || '未分组'}</p>
                  </div>
                </div>
                <div className='flex gap-1 self-end sm:self-auto'>
                  <button
                    type='button'
                    className='icon-button'
                    onClick={() => toggleMutation.mutate(account)}
                    disabled={toggleMutation.isPending}
                    aria-label={`${account.active ? '停用' : '启用'}账户 ${account.name}`}
                    title={account.active ? '停用' : '启用'}
                  >
                    <Power size={17} />
                  </button>
                  <button
                    type='button'
                    className='icon-button'
                    onClick={() => openEdit(account)}
                    aria-label={`编辑账户 ${account.name}`}
                    title='编辑'
                  >
                    <Pencil size={17} />
                  </button>
                  <button
                    type='button'
                    className='icon-button-danger'
                    onClick={() => setDeleting(account)}
                    disabled={deleteMutation.isPending}
                    aria-label={`删除账户 ${account.name}`}
                    title='删除'
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <Modal
        open={formOpen}
        title={editing ? '编辑账户' : '新建账户'}
        description='账户信息仅用于生成本地计划。'
        onClose={() => setFormOpen(false)}
      >
        <AccountForm
          key={editing?.id ?? 'new'}
          account={editing}
          pending={saveMutation.isPending}
          onSubmit={(input) => saveMutation.mutate(input)}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>
      <ConfirmDialog
        open={Boolean(deleting)}
        title={`删除“${deleting?.name ?? ''}”`}
        description='删除后无法恢复；如果这个账户已经出现在历史任务中，请改为停用以保留记录。'
        confirmLabel='删除账户'
        pending={deleteMutation.isPending}
        onConfirm={() => {
          if (deleting) deleteMutation.mutate(deleting.id)
        }}
        onClose={() => setDeleting(undefined)}
      />
    </div>
  )
}
