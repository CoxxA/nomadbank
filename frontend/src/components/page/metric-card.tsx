import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type MetricCardProps = {
  label: string
  value: React.ReactNode
  description?: string
  size?: 'default' | 'compact' | 'dense'
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
  const isDense = size === 'dense'
  return (
    <Card
      className={cn(
        'glass-card',
        isDense && 'gap-2 rounded-lg py-2',
        isCompact && !isDense && 'gap-3 rounded-lg py-3',
        className
      )}
    >
      <CardContent
        className={cn(
          'space-y-2',
          isDense ? 'p-2' : isCompact ? 'p-3' : 'p-4'
        )}
      >
        <p
          className={cn(
            'text-muted-foreground',
            isDense
              ? 'text-[12px] leading-snug'
              : isCompact
                ? 'text-[11px] leading-snug'
                : 'text-sm'
          )}
        >
          {label}
        </p>
        <div
          className={cn(
            'font-semibold text-foreground',
            isDense
              ? 'text-xl leading-tight'
              : isCompact
                ? 'text-lg leading-tight'
                : 'text-2xl'
          )}
        >
          {value}
        </div>
        {description ? (
          <p
            className={cn(
              'text-muted-foreground',
              isDense
                ? 'text-[12px] leading-snug'
                : isCompact
                  ? 'text-[11px] leading-snug'
                  : 'text-sm'
            )}
          >
            {description}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
