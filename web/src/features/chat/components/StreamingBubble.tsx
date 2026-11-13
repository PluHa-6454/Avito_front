import { AlertTriangle, Bot, Loader2, RefreshCw, WifiOff } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getErrorHint, getErrorMessage, getUserMessage, isApiError } from '@/shared/api/errors'
import type { StreamState } from '@/features/chat/stream-manager'

import { SourceList } from './SourceList'

type StreamingBubbleProps = {
  stream: StreamState
  retrySeconds: number
  onRetry: () => void
}

export function StreamingBubble({ stream, retrySeconds, onRetry }: StreamingBubbleProps) {
  if (stream.phase === 'error') {
    const error = stream.error
    const hint = getErrorHint(error)
    const requestId = isApiError(error) ? error.requestId : null
    const isRateLimited = isApiError(error) && error.code === 'RATE_LIMITED'

    return (
      <div className="flex gap-3" aria-live="polite">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive">
          {isRateLimited ? (
            <WifiOff className="size-4" aria-hidden="true" />
          ) : (
            <AlertTriangle className="size-4" aria-hidden="true" />
          )}
        </span>
        <div className="max-w-[85%] rounded-2xl border border-destructive/25 bg-destructive/5 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Не удалось получить ответ</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {getUserMessage(error) || 'Попробуйте повторить запрос.'}
          </p>
          {getErrorMessage(error) !== getUserMessage(error) ? (
            <p className="mt-1 text-xs text-muted-foreground">{getErrorMessage(error)}</p>
          ) : null}
          {hint ? <p className="mt-1 text-xs font-medium text-foreground">{hint}</p> : null}
          {requestId ? (
            <p className="mt-2 font-mono text-[11px] text-muted-foreground">request_id: {requestId}</p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={onRetry}
            disabled={retrySeconds > 0}
          >
            <RefreshCw className={cn('size-4', retrySeconds > 0 && 'opacity-60')} aria-hidden="true" />
            {retrySeconds > 0 ? `Повторить через ${retrySeconds} с` : 'Повторить'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3" aria-live="polite" aria-busy="true">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <Bot className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 max-w-[85%] space-y-2">
        <div className="rounded-2xl border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            {stream.phase === 'connecting' ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <span className="size-1.5 animate-pulse rounded-full bg-primary" aria-hidden="true" />
            )}
            <span className="font-medium text-foreground">AI-buddy</span>
            {stream.statusText ? <span>· {stream.statusText}</span> : null}
          </div>

          {stream.text ? (
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-card-foreground">
              {stream.text}
              <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-primary/70 align-text-bottom" />
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              {stream.phase === 'connecting' ? 'Готовлю ответ…' : 'Печатаю ответ…'}
            </p>
          )}

          {stream.sources.length > 0 ? (
            <SourceList sources={stream.sources} className="mt-3" compact />
          ) : null}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Ответ можно остановить — сообщение сохранится.
        </p>
      </div>
    </div>
  )
}
