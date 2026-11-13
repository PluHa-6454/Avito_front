import { SendHorizontal, Square } from 'lucide-react'
import type { RefObject } from 'react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

const MAX_LENGTH = 4000

type ChatComposerProps = {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onStop: () => void
  streaming: boolean
  disabled?: boolean
  autoFocus?: boolean
  inputRef?: RefObject<HTMLTextAreaElement | null>
}

export function ChatComposer({
  value,
  onChange,
  onSend,
  onStop,
  streaming,
  disabled,
  autoFocus,
  inputRef,
}: ChatComposerProps) {
  const trimmed = value.trim()
  const isSendDisabled = disabled || streaming || trimmed.length === 0

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey) {
      return
    }

    if (event.nativeEvent.isComposing) {
      return
    }

    event.preventDefault()

    if (!isSendDisabled) {
      onSend()
    }
  }

  return (
    <div className="border-t border-border bg-card px-4 py-3 lg:px-6">
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor="chat-message" className="sr-only">
            Сообщение
          </label>
          <Textarea
            id="chat-message"
            ref={inputRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Спросите про команду, доступы, задачу или отгул…"
            rows={2}
            maxLength={MAX_LENGTH}
            autoFocus={autoFocus}
            disabled={disabled}
            className="max-h-40 min-h-[52px] resize-none"
          />
        </div>
        {streaming ? (
          <Button type="button" variant="outline" onClick={onStop} className="h-[52px]">
            <Square className="size-4" aria-hidden="true" />
            Остановить
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onSend}
            disabled={isSendDisabled}
            className="h-[52px] px-4"
            aria-label="Отправить сообщение"
          >
            <SendHorizontal className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Отправить</span>
          </Button>
        )}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span>Enter — отправить, Shift+Enter — новая строка</span>
        <span className={trimmed.length > MAX_LENGTH - 300 ? 'text-warning' : undefined}>
          {value.length} / {MAX_LENGTH}
        </span>
      </div>
    </div>
  )
}
