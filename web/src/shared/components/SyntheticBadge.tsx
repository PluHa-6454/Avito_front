import { FlaskConical } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type SyntheticBadgeProps = {
  className?: string
  label?: string
}

export function SyntheticBadge({ className, label = 'тестовый' }: SyntheticBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 border-dashed bg-background/60 font-normal text-muted-foreground',
        className,
      )}
    >
      <FlaskConical className="size-3" aria-hidden="true" />
      {label}
    </Badge>
  )
}
