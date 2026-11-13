import { ArrowRight, ClipboardList } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { Action } from '@/shared/api/schemas'
import { ErrorState } from '@/shared/components/ErrorState'
import { LoadingState } from '@/shared/components/LoadingState'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { formatDate } from '@/shared/lib/format'

import { ACTION_TYPE_LABELS } from '../labels'
import { useActions } from '../queries'

function getActionSummary(action: Action): string | null {
  const result = action.result

  if (!result) {
    return null
  }

  if (typeof result.number === 'string') {
    return `№ ${result.number}`
  }

  if (typeof result.request_id === 'string') {
    return `№ ${result.request_id}`
  }

  return null
}

type RecentActionsCardProps = {
  className?: string
}

export function RecentActionsCard({ className }: RecentActionsCardProps) {
  const actionsQuery = useActions()
  const items = actionsQuery.data?.items.slice(0, 3) ?? []

  return (
    <Card className={className}>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="size-4 text-primary" aria-hidden="true" />
            Мои заявки
          </CardTitle>
          <Link
            to="/requests"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Все
            <ArrowRight className="size-3" aria-hidden="true" />
          </Link>
        </div>
        <CardDescription>Последние действия и их статусы.</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {actionsQuery.isPending ? (
          <LoadingState label="Загружаем заявки" rows={2} />
        ) : actionsQuery.isError ? (
          <ErrorState
            error={actionsQuery.error}
            title="Не удалось загрузить заявки"
            onRetry={() => void actionsQuery.refetch()}
            className="border-0 px-0 py-4"
          />
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
            Заявок пока нет. Подтвердите черновик в чате.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((action) => {
              const summary = getActionSummary(action)

              return (
                <li
                  key={action.id}
                  className={cn(
                    'flex items-start justify-between gap-2 rounded-lg border border-border/80 px-2.5 py-2',
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-foreground">
                      {ACTION_TYPE_LABELS[action.type]}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {formatDate(action.updated_at)}
                      {summary ? ` · ${summary}` : ''}
                    </p>
                  </div>
                  <StatusBadge status={action.status} className="shrink-0 text-[10px]" />
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
