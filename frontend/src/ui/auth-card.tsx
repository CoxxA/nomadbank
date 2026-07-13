import type { ReactNode } from 'react'
import { Landmark, type LucideIcon } from 'lucide-react'

export interface AuthTrustItem {
  icon: LucideIcon
  title: string
  description: string
}

interface AuthCardProps {
  eyebrow: string
  storyTitle: string
  storyDescription: string
  title: string
  description: string
  trustItems: AuthTrustItem[]
  children: ReactNode
}

const TrustItem = ({ item }: { item: AuthTrustItem }) => {
  const Icon = item.icon

  return (
    <div className='flex gap-3'>
      <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-current/15 bg-current/5'>
        <Icon size={15} strokeWidth={1.8} aria-hidden='true' />
      </div>
      <div>
        <p className='text-sm font-medium'>{item.title}</p>
        <p className='mt-0.5 text-xs leading-5 opacity-65'>{item.description}</p>
      </div>
    </div>
  )
}

export const AuthCard = ({
  eyebrow,
  storyTitle,
  storyDescription,
  title,
  description,
  trustItems,
  children,
}: AuthCardProps) => (
  <main className='min-h-screen overflow-x-hidden bg-[#faf8f2] text-slate-900 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]'>
    <aside className='relative overflow-hidden bg-[#173b31] px-6 py-7 text-[#f8f4e9] sm:px-10 sm:py-9 lg:min-h-screen lg:px-14 lg:py-12 xl:px-20'>
      <div
        className='pointer-events-none absolute -top-32 -right-24 h-80 w-80 rounded-full border border-white/8'
        aria-hidden='true'
      />
      <div
        className='pointer-events-none absolute -right-8 -bottom-32 h-96 w-96 rounded-full bg-emerald-200/5 blur-3xl'
        aria-hidden='true'
      />

      <div className='relative z-10 mx-auto flex h-full max-w-2xl flex-col'>
        <div className='flex items-center gap-3'>
          <div className='flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/8'>
            <Landmark size={18} strokeWidth={1.8} aria-hidden='true' />
          </div>
          <div>
            <p className='text-sm font-semibold tracking-[0.08em]'>NomadBank</p>
            <p className='text-[10px] tracking-[0.18em] text-emerald-100/55 uppercase'>
              Private ledger
            </p>
          </div>
        </div>

        <div className='flex flex-1 items-center py-8 sm:py-10 lg:py-16'>
          <div className='max-w-xl'>
            <p className='text-[11px] font-semibold tracking-[0.22em] text-emerald-200/70 uppercase'>
              {eyebrow}
            </p>
            <h2 className='mt-3 max-w-lg text-2xl leading-tight font-medium tracking-[-0.025em] text-balance sm:text-3xl lg:mt-5 lg:text-[2.75rem] lg:leading-[1.12]'>
              {storyTitle}
            </h2>
            <p className='mt-4 hidden max-w-lg text-sm leading-7 text-emerald-50/65 sm:block lg:text-base'>
              {storyDescription}
            </p>

            <div className='mt-10 hidden max-w-lg grid-cols-2 gap-x-8 gap-y-7 border-t border-white/12 pt-8 text-emerald-50 lg:grid'>
              {trustItems.map((item) => (
                <TrustItem key={item.title} item={item} />
              ))}
            </div>
          </div>
        </div>

        <p className='hidden text-xs tracking-wide text-emerald-100/40 lg:block'>
          一份只属于你的账户保活记录。
        </p>
      </div>
    </aside>

    <section className='flex min-h-[calc(100vh-12rem)] min-w-0 items-center px-6 py-10 sm:px-10 sm:py-14 lg:min-h-screen lg:px-12 xl:px-16 2xl:px-24'>
      <div className='mx-auto w-full max-w-md'>
        <div className='mb-8'>
          <p className='mb-3 text-[11px] font-semibold tracking-[0.2em] text-[#35715f] uppercase'>
            {eyebrow}
          </p>
          <h1 className='text-3xl font-semibold tracking-[-0.035em] text-slate-900 sm:text-[2.15rem]'>
            {title}
          </h1>
          <p className='mt-3 max-w-sm text-sm leading-6 text-slate-500'>{description}</p>
        </div>

        {children}

        <div className='mt-9 border-t border-stone-200 pt-6 text-slate-700 lg:hidden'>
          <p className='mb-4 text-[11px] font-semibold tracking-[0.18em] text-slate-400 uppercase'>
            私人部署，边界清楚
          </p>
          <div className='grid gap-4 sm:grid-cols-2'>
            {trustItems.map((item) => (
              <TrustItem key={item.title} item={item} />
            ))}
          </div>
        </div>
      </div>
    </section>
  </main>
)
