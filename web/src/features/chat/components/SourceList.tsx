import { FileText } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { Source } from '@/shared/api/schemas'
import { SyntheticBadge } from '@/shared/components/SyntheticBadge'

type SourceListProps = {
  sources: Source[]
  className?: string
  compact?: boolean
}

export function SourceList({ sources, className, compact = false }: SourceListProps) {
  if (sources.length === 0) {
    return null
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Источники
      </p>
      <ul className="flex flex-wrap gap-1.5" aria-label="Источники ответа">
        {sources.map((source) => (
          <li
            key={source.doc_id}
            tabIndex={0}
            aria-label={`Источник: ${source.title}${source.synthetic ? ', тестовый документ' : ''}`}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border border-border bg-background/70 px-2 py-1 text-xs text-foreground',
              'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              compact && 'py-0.5 text-[11px]',
            )}
          >
            <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="max-w-[260px] truncate">{source.title}</span>
            {source.synthetic ? <SyntheticBadge className="px-1.5 py-0" /> : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
