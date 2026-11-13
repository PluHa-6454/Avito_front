import { AlertTriangle, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getErrorHint, getErrorMessage, getUserMessage, isApiError } from '@/shared/api/errors'

type ErrorStateProps = {
  error?: unknown
  title?: string
  description?: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}

export function ErrorState({
  error,
  title = 'Не удалось загрузить данные',
  description,
  onRetry,
  retryLabel = 'Повторить',
  className,
}: ErrorStateProps) {
  const message = description ?? (error ? getUserMessage(error) : title)
  const details = error ? getErrorMessage(error) : null
  const hint = getErrorHint(error)
  const requestId = isApiError(error) ? error.requestId : null

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-destructive/25 bg-destructive/5 px-6 py-10 text-center',
        className,
      )}
    >
      <span className="mb-4 grid size-11 place-items-center rounded-full bg-background text-destructive ring-1 ring-destructive/20">
        <AlertTriangle className="size-5" aria-hidden="true" />
      </span>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      {details && details !== message ? (
        <p className="mt-2 max-w-md text-xs text-muted-foreground">{details}</p>
      ) : null}
      {hint ? (
        <p className="mt-2 max-w-md text-sm font-medium text-foreground">{hint}</p>
      ) : null}
      {requestId ? (
        <p className="mt-3 font-mono text-[11px] text-muted-foreground">request_id: {requestId}</p>
      ) : null}
      {onRetry ? (
        <Button type="button" variant="outline" className="mt-5" onClick={onRetry}>
          <RefreshCw className="size-4" aria-hidden="true" />
          {retryLabel}
        </Button>
      ) : null}
    </div>
  )
}
