import { AlertTriangle } from 'lucide-react'
import { Modal } from './modal'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  pending?: boolean
  onConfirm: () => void
  onClose: () => void
}

export const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel,
  pending = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) => (
  <Modal open={open} title={title} onClose={onClose}>
    <div className='flex gap-3 rounded-xl border border-[#ead1cc] bg-[#fbf1ee] p-4 text-[#71443d]'>
      <AlertTriangle className='mt-0.5 shrink-0' size={19} />
      <p className='text-sm leading-6'>{description}</p>
    </div>
    <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
      <button type='button' className='button-secondary' onClick={onClose} disabled={pending}>
        取消
      </button>
      <button type='button' className='button-danger' onClick={onConfirm} disabled={pending}>
        {pending ? '正在处理…' : confirmLabel}
      </button>
    </div>
  </Modal>
)
