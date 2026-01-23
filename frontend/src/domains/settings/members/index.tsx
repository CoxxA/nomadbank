import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Key,
  Loader2,
  Pencil,
  Plus,
  Shield,
  Trash2,
  User as UserIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { PasswordInput } from '@/components/password-input'
import { usersApi } from '@/lib/api'
import { parseDateKey } from '@/lib/utils'
import type { User, UserRole } from '@/lib/types'
import { useAuthStore } from '@/stores/auth-store'
import { ContentSection } from '../components/content-section'

export function SettingsMembers() {
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  // 表单状态
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    nickname: '',
    role: 'user' as UserRole,
  })
  const [newPassword, setNewPassword] = useState('')

  // 获取用户列表
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
  })

  // 创建用户
  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setCreateDialogOpen(false)
      resetForm()
      toast.success('用户创建成功')
    },
    onError: (error: Error) => {
      toast.error(error.message || '创建失败')
    },
  })

  // 更新用户
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: { role?: UserRole; nickname?: string }
    }) => usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setEditDialogOpen(false)
      toast.success('用户更新成功')
    },
    onError: (error: Error) => {
      toast.error(error.message || '更新失败')
    },
  })

  // 重置密码
  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      usersApi.resetPassword(id, { password }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setResetPasswordDialogOpen(false)
      setNewPassword('')
      toast.success('密码重置成功')
    },
    onError: (error: Error) => {
      toast.error(error.message || '重置失败')
    },
  })

  // 删除用户
  const deleteMutation = useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setDeleteDialogOpen(false)
      toast.success('用户删除成功')
    },
    onError: (error: Error) => {
      toast.error(error.message || '删除失败')
    },
  })

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      nickname: '',
      role: 'user',
    })
  }

  const handleCreate = () => {
    resetForm()
    setCreateDialogOpen(true)
  }

  const handleEdit = (user: User) => {
    setSelectedUser(user)
    setFormData({
      username: user.username,
      password: '',
      nickname: user.nickname,
      role: user.role,
    })
    setEditDialogOpen(true)
  }

  const handleResetPassword = (user: User) => {
    setSelectedUser(user)
    setNewPassword('')
    setResetPasswordDialogOpen(true)
  }

  const handleDelete = (user: User) => {
    setSelectedUser(user)
    setDeleteDialogOpen(true)
  }

  const submitCreate = () => {
    if (!formData.username || !formData.password) {
      toast.error('请填写用户名和密码')
      return
    }
    createMutation.mutate({
      username: formData.username,
      password: formData.password,
      nickname: formData.nickname || formData.username,
      role: formData.role,
    })
  }

  const submitEdit = () => {
    if (!selectedUser) return
    updateMutation.mutate({
      id: selectedUser.id,
      data: {
        role: formData.role,
        nickname: formData.nickname,
      },
    })
  }

  const submitResetPassword = () => {
    if (!selectedUser || !newPassword) {
      toast.error('请输入新密码')
      return
    }
    resetPasswordMutation.mutate({
      id: selectedUser.id,
      password: newPassword,
    })
  }

  const submitDelete = () => {
    if (!selectedUser) return
    deleteMutation.mutate(selectedUser.id)
  }

  return (
    <ContentSection title='成员管理' desc='管理系统中的所有用户账户'>
      <div className='space-y-4'>
        <div className='flex justify-end'>
          <Button onClick={handleCreate} size='sm'>
            <Plus className='h-4 w-4' />
            添加成员
          </Button>
        </div>

        {isLoading ? (
          <div className='flex justify-center py-8'>
            <Loader2 className='text-muted-foreground h-8 w-8 animate-spin' />
          </div>
        ) : (
          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户名</TableHead>
                  <TableHead>昵称</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className='text-right'>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className='font-medium'>
                      {user.username}
                    </TableCell>
                    <TableCell>{user.nickname}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.role === 'admin' ? 'default' : 'secondary'
                        }
                      >
                        {user.role === 'admin' ? (
                          <>
                            <Shield className='mr-1 h-3 w-3' />
                            管理员
                          </>
                        ) : (
                          <>
                            <UserIcon className='mr-1 h-3 w-3' />
                            普通用户
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.created_at
                        ? parseDateKey(user.created_at).toLocaleDateString('zh-CN')
                        : '-'}
                    </TableCell>
                    <TableCell className='text-right'>
                      <div className='flex justify-end gap-1'>
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() => handleEdit(user)}
                        >
                          <Pencil className='h-4 w-4' />
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() => handleResetPassword(user)}
                        >
                          <Key className='h-4 w-4' />
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() => handleDelete(user)}
                          disabled={user.id === auth.user?.id}
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
        )}
      </div>

      {/* 创建用户对话框 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加成员</DialogTitle>
            <DialogDescription>创建一个新的用户账户</DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='username'>用户名</Label>
              <Input
                id='username'
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                placeholder='输入用户名'
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='password'>密码</Label>
              <PasswordInput
                id='password'
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder='输入密码'
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='nickname'>昵称</Label>
              <Input
                id='nickname'
                value={formData.nickname}
                onChange={(e) =>
                  setFormData({ ...formData, nickname: e.target.value })
                }
                placeholder='输入昵称（可选）'
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='role'>角色</Label>
              <Select
                value={formData.role}
                onValueChange={(value: UserRole) =>
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='user'>普通用户</SelectItem>
                  <SelectItem value='admin'>管理员</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setCreateDialogOpen(false)}
            >
              取消
            </Button>
            <Button onClick={submitCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && (
                <Loader2 className='h-4 w-4 animate-spin' />
              )}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑用户对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑成员</DialogTitle>
            <DialogDescription>
              修改用户 {selectedUser?.username} 的信息
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='edit-nickname'>昵称</Label>
              <Input
                id='edit-nickname'
                value={formData.nickname}
                onChange={(e) =>
                  setFormData({ ...formData, nickname: e.target.value })
                }
                placeholder='输入昵称'
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='edit-role'>角色</Label>
              <Select
                value={formData.role}
                onValueChange={(value: UserRole) =>
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='user'>普通用户</SelectItem>
                  <SelectItem value='admin'>管理员</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={submitEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending && (
                <Loader2 className='h-4 w-4 animate-spin' />
              )}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 重置密码对话框 */}
      <Dialog
        open={resetPasswordDialogOpen}
        onOpenChange={setResetPasswordDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重置密码</DialogTitle>
            <DialogDescription>
              为用户 {selectedUser?.username} 设置新密码
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='new-password'>新密码</Label>
              <PasswordInput
                id='new-password'
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder='输入新密码（至少 6 个字符）'
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setResetPasswordDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              onClick={submitResetPassword}
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending && (
                <Loader2 className='h-4 w-4 animate-spin' />
              )}
              重置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除用户 "{selectedUser?.username}" 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={submitDelete}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              {deleteMutation.isPending && (
                <Loader2 className='h-4 w-4 animate-spin' />
              )}
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ContentSection>
  )
}
