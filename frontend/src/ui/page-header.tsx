import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description: string
  actions?: ReactNode
}

export const PageHeader = ({ title, description, actions }: PageHeaderProps) => (
  <header className='flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between'>
    <div className='max-w-2xl'>
      <h1 className='text-[1.85rem] font-semibold tracking-[-0.035em] text-[#18231f] sm:text-[2.15rem]'>
        {title}
      </h1>
      <p className='mt-2.5 text-sm leading-6 text-[#68736e] sm:text-[15px]'>{description}</p>
    </div>
    {actions ? <div className='flex shrink-0 items-center gap-2'>{actions}</div> : null}
  </header>
)
