import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type MetricCardProps = {
  label: string
  value: React.ReactNode
  description?: string
  size?: 'default' | 'compact'
  className?: string
}

export function MetricCard({
  label,
  value,
  description,
  size = 'default',
  className,
}: MetricCardProps) {
  const isCompact = size === 'compact'
  return (
    <Card className={cn('glass-card', className)}>
      <CardContent
        className={cn('space-y-2', isCompact ? 'p-3' : 'p-4')}
      >
        <p
          className={cn(
            'text-muted-foreground',
            isCompact ? 'text-xs' : 'text-sm'
          )}
        >
          {label}
        </p>
        <div
          className={cn(
            'font-semibold text-foreground',
            isCompact ? 'text-xl' : 'text-2xl'
          )}
        >
          {value}
        </div>
        {description ? (
          <p
            className={cn(
              'text-muted-foreground',
              isCompact ? 'text-xs' : 'text-sm'
            )}
          >
            {description}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
