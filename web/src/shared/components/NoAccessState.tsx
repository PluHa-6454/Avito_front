import { LockKeyhole } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type NoAccessStateProps = {
  title?: string
  description?: string
  hint?: string | null
  action?: ReactNode
  className?: string
}

export function NoAccessState({
  title = 'Нет доступа',
  description = 'У вашей роли нет прав на это действие.',
  hint,
  action,
  className,
}: NoAccessStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-border bg-muted/30 px-6 py-10 text-center',
        className,
      )}
    >
      <span className="mb-4 grid size-11 place-items-center rounded-full bg-background text-muted-foreground ring-1 ring-border">
        <LockKeyhole className="size-5" aria-hidden="true" />
      </span>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {hint ? <p className="mt-2 max-w-md text-sm font-medium text-foreground">{hint}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
