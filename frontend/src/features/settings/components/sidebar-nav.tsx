import { type JSX, useState } from 'react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { buttonVariants } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

type NavItem = {
  href: string
  title: string
  icon: JSX.Element
}

type NavGroup = {
  title: string
  items: NavItem[]
}

type SidebarNavProps = React.HTMLAttributes<HTMLElement> & {
  groups: NavGroup[]
}

export function SidebarNav({ className, groups, ...props }: SidebarNavProps) {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  // 将所有分组的项目扁平化用于移动端选择器
  const allItems = groups.flatMap((group) => group.items)
  const [val, setVal] = useState(pathname ?? '/settings')

  const handleSelect = (e: string) => {
    setVal(e)
    navigate({ to: e })
  }

  return (
    <>
      {/* 移动端：下拉选择器 */}
      <div className='p-1 md:hidden'>
        <Select value={val} onValueChange={handleSelect}>
          <SelectTrigger className='h-12 sm:w-48'>
            <SelectValue placeholder='选择页面' />
          </SelectTrigger>
          <SelectContent>
            {allItems.map((item) => (
              <SelectItem key={item.href} value={item.href}>
                <div className='flex gap-x-4 px-2 py-1'>
                  <span className='scale-125'>{item.icon}</span>
                  <span className='text-md'>{item.title}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 桌面端：分组侧边栏 */}
      <ScrollArea
        orientation='horizontal'
        type='always'
        className='bg-background hidden w-full min-w-40 px-1 py-2 md:block'
      >
        <nav className={cn('flex flex-col space-y-4', className)} {...props}>
          {groups.map((group) => (
            <div key={group.title} className='space-y-1'>
              {/* 分组标题 */}
              <h4 className='text-muted-foreground px-3 text-xs font-semibold tracking-wider uppercase'>
                {group.title}
              </h4>
              {/* 分组内的导航项 */}
              <div className='space-y-1'>
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      buttonVariants({ variant: 'ghost' }),
                      pathname === item.href
                        ? 'bg-muted hover:bg-accent'
                        : 'hover:bg-accent hover:underline',
                      'w-full justify-start'
                    )}
                  >
                    <span className='me-2'>{item.icon}</span>
                    {item.title}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>
    </>
  )
}
