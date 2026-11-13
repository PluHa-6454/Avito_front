import {
  CalendarDays,
  Check,
  KeyRound,
  ListTodo,
  Loader2,
  MessageCircleQuestion,
  PencilLine,
  RefreshCw,
  X,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ActionResult, ActionStatus, ActionType } from '@/shared/api/schemas'
import { getErrorHint, getUserMessage, isApiError } from '@/shared/api/errors'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { SyntheticBadge } from '@/shared/components/SyntheticBadge'
import { createId } from '@/shared/lib/id'

import {
  ACTION_TYPE_HINTS,
  ACTION_TYPE_LABELS,
  buildEditPrefill,
  getFieldRows,
  getResultRows,
} from '../labels'
import { useAction, useCancelAction, useConfirmAction } from '../queries'

const TYPE_ICONS = {
  'absence.create': CalendarDays,
  'access.request': KeyRound,
  'tasks.transition': ListTodo,
  'mentor.ask': MessageCircleQuestion,
} as const

type ActionCardProps = {
  actionId: string
  type: ActionType
  fields: Record<string, unknown>
  streamStatus?: ActionStatus
  streamResult?: ActionResult | null
  onEdit: (prefill: string) => void
}

export function ActionCard({
  actionId,
  type,
  fields: draftFields,
  streamStatus,
  streamResult,
  onEdit,
}: ActionCardProps) {
  const actionQuery = useAction(actionId)
  const confirmMutation = useConfirmAction()
  const cancelMutation = useCancelAction()

  const idempotencyKeyRef = useRef<string | null>(null)
  const confirmingRef = useRef(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const live = actionQuery.data
  const status: ActionStatus = live?.status ?? streamStatus ?? 'draft'
  const fields = live?.fields ?? draftFields
  const result = live?.result ?? streamResult ?? null
  const Icon = TYPE_ICONS[type]
  const rows = getFieldRows(type, fields)
  const resultRows = result ? getResultRows(result) : []
  const isDraft = status === 'draft'
  const isBusy = status === 'executing' || submitting || confirmMutation.isPending

  async function handleConfirm() {
    if (!isDraft || confirmingRef.current || isBusy) {
      return
    }

    confirmingRef.current = true
    setSubmitting(true)
    setError(null)

    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = createId()
    }

    try {
      await confirmMutation.mutateAsync({
        actionId,
        idempotencyKey: idempotencyKeyRef.current,
      })
    } catch (confirmError) {
      setError(confirmError)
      toast.error(getUserMessage(confirmError))
    } finally {
      confirmingRef.current = false
      setSubmitting(false)
    }
  }

  async function handleCancel() {
    if (!isDraft || cancelMutation.isPending) {
      return
    }

    setError(null)

    try {
      await cancelMutation.mutateAsync(actionId)
    } catch (cancelError) {
      setError(cancelError)
      toast.error(getUserMessage(cancelError))
    }
  }

  async function handleEdit() {
    if (!isDraft) {
      return
    }

    try {
      await cancelMutation.mutateAsync(actionId)
    } catch (cancelError) {
      toast.error(getUserMessage(cancelError))
    }

    onEdit(buildEditPrefill(type, fields))
  }

  return (
    <section
      aria-label={`Карточка действия: ${ACTION_TYPE_LABELS[type]}`}
      className="rounded-2xl border border-border bg-card shadow-sm"
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {ACTION_TYPE_LABELS[type]}
            </p>
            <p className="text-[11px] text-muted-foreground">Черновик AI-buddy</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SyntheticBadge className="hidden sm:inline-flex" />
          <StatusBadge status={status} />
        </div>
      </header>

      <div className="space-y-3 px-4 py-3">
        <dl className="grid gap-2 sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label} className="min-w-0">
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {row.label}
              </dt>
              <dd className="break-words text-sm text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>

        {status === 'done' && resultRows.length > 0 ? (
          <div
            role="status"
            className={cn(
              'rounded-xl border border-success/30 bg-success/5 px-3 py-2.5',
              'space-y-1',
            )}
          >
            <p className="flex items-center gap-1.5 text-xs font-semibold text-success">
              <Check className="size-3.5" aria-hidden="true" />
              Результат
            </p>
            <dl className="grid gap-1 sm:grid-cols-2">
              {resultRows.map((row) => (
                <div key={row.label} className="flex min-w-0 items-baseline gap-1.5">
                  <dt className="text-[11px] text-muted-foreground">{row.label}:</dt>
                  <dd className="truncate text-xs font-medium text-foreground">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}

        {status === 'executing' ? (
          <p
            role="status"
            className="flex items-center gap-2 rounded-xl border border-info/30 bg-info/5 px-3 py-2 text-xs text-info"
          >
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            Отправляем в корпоративный сервис…
          </p>
        ) : null}

        {status === 'failed' ? (
          <p
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
          >
            {live?.error?.message ?? 'Не удалось выполнить действие. Попробуйте ещё раз.'}
          </p>
        ) : null}

        {error ? (
          <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2">
            <p className="text-xs font-medium text-destructive">{getUserMessage(error)}</p>
            {getErrorHint(error) ? (
              <p className="mt-0.5 text-[11px] text-muted-foreground">{getErrorHint(error)}</p>
            ) : null}
            {isApiError(error) && error.requestId ? (
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                request_id: {error.requestId}
              </p>
            ) : null}
          </div>
        ) : null}

        <p className="text-[11px] text-muted-foreground">{ACTION_TYPE_HINTS[type]}</p>
      </div>

      {isDraft ? (
        <footer className="flex flex-wrap items-center gap-2 border-t border-border/80 px-4 py-3">
          <Button type="button" onClick={() => void handleConfirm()} disabled={isBusy}>
            {isBusy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : error ? (
              <RefreshCw className="size-4" aria-hidden="true" />
            ) : (
              <Check className="size-4" aria-hidden="true" />
            )}
            {isBusy ? 'Подтверждаем…' : error ? 'Повторить' : 'Подтвердить'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleEdit()}
            disabled={isBusy || cancelMutation.isPending}
          >
            <PencilLine className="size-4" aria-hidden="true" />
            Изменить
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => void handleCancel()}
            disabled={isBusy || cancelMutation.isPending}
            className="text-muted-foreground"
          >
            <X className="size-4" aria-hidden="true" />
            Отменить
          </Button>
        </footer>
      ) : null}
    </section>
  )
}

export function ActionCardList({
  actions,
  onEdit,
}: {
  actions: Array<{
    actionId: string
    type: ActionType
    fields: Record<string, unknown>
    status?: ActionStatus
    result?: ActionResult | null
  }>
  onEdit: (prefill: string) => void
}) {
  if (actions.length === 0) {
    return null
  }

  return (
    <div className="space-y-3" aria-label="Черновики действий">
      {actions.map((action) => (
        <ActionCard
          key={action.actionId}
          actionId={action.actionId}
          type={action.type}
          fields={action.fields}
          streamStatus={action.status}
          streamResult={action.result}
          onEdit={onEdit}
        />
      ))}
    </div>
  )
}

