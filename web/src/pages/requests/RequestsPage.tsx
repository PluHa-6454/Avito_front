import { ClipboardList, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ActionDetailsSheet } from '@/features/actions/components/ActionDetailsSheet'
import { ACTION_TYPE_LABELS, getFieldRows, getResultRows } from '@/features/actions/labels'
import { useActions } from '@/features/actions/queries'
import type { Action, ActionStatus, ActionType } from '@/shared/api/schemas'
import { EmptyState } from '@/shared/components/EmptyState'
import { ErrorState } from '@/shared/components/ErrorState'
import { LoadingState } from '@/shared/components/LoadingState'
import { NoAccessState } from '@/shared/components/NoAccessState'
import { PageHeader } from '@/shared/components/PageHeader'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { cn } from '@/lib/utils'
import { formatDate } from '@/shared/lib/format'
import { isApiError } from '@/shared/api/errors'

const STATUS_OPTIONS: Array<{ value: ActionStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Все' },
  { value: 'draft', label: 'Черновики' },
  { value: 'done', label: 'Готово' },
  { value: 'failed', label: 'Ошибки' },
  { value: 'cancelled', label: 'Отменено' },
]

const TYPE_OPTIONS: Array<{ value: ActionType | 'all'; label: string }> = [
  { value: 'all', label: 'Все типы' },
  { value: 'absence.create', label: ACTION_TYPE_LABELS['absence.create'] },
  { value: 'access.request', label: ACTION_TYPE_LABELS['access.request'] },
  { value: 'tasks.transition', label: ACTION_TYPE_LABELS['tasks.transition'] },
  { value: 'mentor.ask', label: ACTION_TYPE_LABELS['mentor.ask'] },
]

function getActionSummary(action: Action): string | null {
  if (!action.result) {
    return null
  }

  const rows = getResultRows(action.result)
  return rows.length > 0 ? rows.map((row) => `${row.label}: ${row.value}`).join(' · ') : null
}

export function RequestsPage() {
  const actionsQuery = useActions()
  const [status, setStatus] = useState<ActionStatus | 'all'>('all')
  const [type, setType] = useState<ActionType | 'all'>('all')
  const [selected, setSelected] = useState<Action | null>(null)

  const allItems = actionsQuery.data?.items ?? []

  const items = allItems.filter(
    (action) =>
      (status === 'all' || action.status === status) &&
      (type === 'all' || action.type === type),
  )

  const hasFilters = status !== 'all' || type !== 'all'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Мои заявки"
        description="Все действия со статусами и историей: отгулы, доступы, задачи и обращения к наставнику."
        actions={
          <Button variant="outline" asChild>
            <Link to="/">
              <ClipboardList className="size-4" aria-hidden="true" />
              Вернуться в чат
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-4">
          <div className="min-w-0 flex-1">
            <p
              id="status-filter-label"
              className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              <SlidersHorizontal className="size-3.5" aria-hidden="true" />
              Статус
            </p>
            <div
              role="group"
              aria-labelledby="status-filter-label"
              className="flex flex-wrap gap-1.5"
            >
              {STATUS_OPTIONS.map((option) => {
                const isActive = status === option.value

                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setStatus(option.value)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                      'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                      isActive
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="w-full sm:w-56">
            <label
              htmlFor="type-filter"
              className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              Тип действия
            </label>
            <select
              id="type-filter"
              value={type}
              onChange={(event) => setType(event.target.value as ActionType | 'all')}
              className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {actionsQuery.isPending ? (
        <LoadingState label="Загружаем заявки" rows={5} />
      ) : actionsQuery.isError ? (
        isApiError(actionsQuery.error) && actionsQuery.error.status === 403 ? (
          <NoAccessState
            title="Заявки недоступны"
            description="У вашей роли нет доступа к списку заявок."
            hint={actionsQuery.error.hint}
          />
        ) : (
          <ErrorState
            error={actionsQuery.error}
            title="Не удалось загрузить заявки"
            onRetry={() => void actionsQuery.refetch()}
          />
        )
      ) : allItems.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Заявок пока нет"
          description="Подтвердите черновик в чате — заявка появится здесь со статусом и историей."
          action={
            <Button asChild>
              <Link to="/">Перейти в чат</Link>
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Ничего не найдено"
          description="Попробуйте изменить фильтры по статусу или типу действия."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setStatus('all')
                setType('all')
              }}
            >
              Сбросить фильтры
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3" aria-label="Список заявок">
          {items.map((action) => {
            const fieldRows = getFieldRows(action.type, action.fields)
            const summary = getActionSummary(action)

            return (
              <li key={action.id}>
                <Card>
                  <CardContent className="flex flex-wrap items-start justify-between gap-3 pt-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-semibold text-foreground">
                          {ACTION_TYPE_LABELS[action.type]}
                        </h2>
                        <StatusBadge status={action.status} />
                        <span className="text-[11px] text-muted-foreground">
                          {formatDate(action.updated_at)}
                        </span>
                      </div>

                      {fieldRows.length > 0 ? (
                        <dl className="grid gap-1 sm:grid-cols-2">
                          {fieldRows.map((row) => (
                            <div key={row.label} className="flex min-w-0 gap-1.5 text-xs">
                              <dt className="shrink-0 text-muted-foreground">{row.label}:</dt>
                              <dd className="truncate text-foreground">{row.value}</dd>
                            </div>
                          ))}
                        </dl>
                      ) : null}

                      {summary ? (
                        <p className="text-[11px] text-muted-foreground">{summary}</p>
                      ) : null}
                    </div>

                    <Button variant="outline" size="sm" onClick={() => setSelected(action)}>
                      Подробнее
                    </Button>
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      {hasFilters ? (
        <p className="text-center text-[11px] text-muted-foreground">
          Показано {items.length} из {allItems.length}
        </p>
      ) : null}

      <ActionDetailsSheet
        action={selected}
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null)
          }
        }}
      />
    </div>
  )
}
