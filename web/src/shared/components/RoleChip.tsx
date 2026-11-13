import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Role } from '@/shared/api/schemas'
import { ROLE_LABELS } from '@/shared/lib/roles'

type RoleChipProps = {
  role: Role
  teamName?: string
  className?: string
}

export function RoleChip({ role, teamName, className }: RoleChipProps) {
  return (
    <Badge
      variant="secondary"
      className={cn('gap-1.5 rounded-full px-2.5 py-1 font-medium', className)}
    >
      <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
      {ROLE_LABELS[role]}
      {teamName ? <span className="text-muted-foreground">· {teamName}</span> : null}
    </Badge>
  )
}
