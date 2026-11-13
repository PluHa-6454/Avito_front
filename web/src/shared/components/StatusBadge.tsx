import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ActionStatus, StepStatus } from '@/shared/api/schemas'

type StatusKind = ActionStatus | StepStatus

const STATUS_CONFIG: Record<StatusKind, { label: string; className: string }> = {
  draft: {
    label: 'Черновик',
    className: 'border-border bg-muted text-muted-foreground',
  },
  confirmed: {
    label: 'Подтверждено',
    className: 'border-info/30 bg-info/10 text-info',
  },
  executing: {
    label: 'Выполняется',
    className: 'border-info/30 bg-info/10 text-info',
  },
  done: {
    label: 'Готово',
    className: 'border-success/30 bg-success/10 text-success',
  },
  failed: {
    label: 'Ошибка',
    className: 'border-destructive/30 bg-destructive/10 text-destructive',
  },
  cancelled: {
    label: 'Отменено',
    className: 'border-border bg-muted text-muted-foreground line-through',
  },
  in_progress: {
    label: 'В работе',
    className: 'border-info/30 bg-info/10 text-info',
  },
  pending: {
    label: 'Ожидает',
    className: 'border-border bg-background text-muted-foreground',
  },
}

type StatusBadgeProps = {
  status: StatusKind
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <Badge variant="outline" className={cn('font-medium', config.className, className)}>
      {config.label}
    </Badge>
  )
}
