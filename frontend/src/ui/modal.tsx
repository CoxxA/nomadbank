import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  title: string
  description?: string
  children: ReactNode
  onClose: () => void
}

export const Modal = ({ open, title, description, children, onClose }: ModalProps) => {
  const titleID = useId()
  const descriptionID = useId()
  const dialogRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return

    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const firstField = dialogRef.current?.querySelector<HTMLElement>(
      'input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
    )
    const focusTarget = firstField ?? closeButtonRef.current
    focusTarget?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        )
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className='fixed inset-0 z-50 flex items-end justify-center bg-[#16221d]/45 p-0 backdrop-blur-[3px] sm:items-center sm:p-5'
      role='presentation'
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        ref={dialogRef}
        className='max-h-[92dvh] w-full overflow-y-auto rounded-t-[22px] border border-[#d9dfda] bg-[#fffefa] shadow-[0_24px_80px_rgba(20,35,29,0.22)] sm:max-w-lg sm:rounded-2xl'
        role='dialog'
        aria-modal='true'
        aria-labelledby={titleID}
        aria-describedby={description ? descriptionID : undefined}
      >
        <header className='sticky top-0 z-10 flex items-start justify-between border-b border-[#e2e6e2] bg-[#fffefa]/95 px-6 py-5 backdrop-blur'>
          <div>
            <h2 id={titleID} className='text-lg font-semibold tracking-[-0.02em] text-[#18231f]'>
              {title}
            </h2>
            {description ? (
              <p id={descriptionID} className='mt-1.5 text-sm leading-5 text-[#68736e]'>
                {description}
              </p>
            ) : null}
          </div>
          <button
            ref={closeButtonRef}
            type='button'
            className='icon-button -mr-1'
            onClick={onClose}
            aria-label='关闭'
          >
            <X size={18} />
          </button>
        </header>
        <div className='p-6'>{children}</div>
      </section>
    </div>
  )
}
