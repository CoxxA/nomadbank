import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type MetricCardProps = {
  label: string
  value: React.ReactNode
  description?: string
  className?: string
}

export function MetricCard({
  label,
  value,
  description,
  className,
}: MetricCardProps) {
  return (
    <Card className={cn('glass-card', className)}>
      <CardContent className='space-y-2 p-4'>
        <p className='text-sm text-muted-foreground'>{label}</p>
        <div className='text-2xl font-semibold text-foreground'>{value}</div>
        {description ? (
          <p className='text-sm text-muted-foreground'>{description}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
