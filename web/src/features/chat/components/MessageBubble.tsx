import { Bot, UserRound } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { cn } from '@/lib/utils'
import type { FeedbackRating, Message } from '@/shared/api/schemas'
import { formatTime } from '@/shared/lib/format'

import { FeedbackControl } from './FeedbackControl'
import { SourceList } from './SourceList'

type MessageBubbleProps = {
  message: Message
  feedbackPending?: boolean
  onRate?: (rating: FeedbackRating, comment?: string) => void
}

export function MessageBubble({ message, feedbackPending, onRate }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <article
      className={cn('flex gap-3', isUser && 'flex-row-reverse')}
      aria-label={isUser ? 'Ваше сообщение' : 'Ответ AI-buddy'}
    >
      <span
        className={cn(
          'mt-0.5 grid size-8 shrink-0 place-items-center rounded-full',
          isUser ? 'bg-muted text-foreground' : 'bg-primary/10 text-primary',
        )}
        aria-hidden="true"
      >
        {isUser ? <UserRound className="size-4" /> : <Bot className="size-4" />}
      </span>

      <div className={cn('min-w-0 max-w-[85%] space-y-2', isUser && 'flex flex-col items-end')}>
        <div
          className={cn(
            'rounded-2xl border px-4 py-3 text-sm leading-relaxed',
            isUser
              ? 'border-primary/20 bg-primary text-primary-foreground'
              : 'border-border bg-card text-card-foreground',
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.text}</p>
          ) : (
            <div className="chat-markdown break-words">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown>
            </div>
          )}
        </div>

        <div
          className={cn(
            'flex items-center gap-2 text-[11px] text-muted-foreground',
            isUser && 'flex-row-reverse',
          )}
        >
          <time dateTime={message.created_at}>{formatTime(message.created_at)}</time>
          {message.status === 'error' ? (
            <span className="font-medium text-destructive">Ответ прерван</span>
          ) : null}
        </div>

        {!isUser && message.sources.length > 0 ? (
          <SourceList sources={message.sources} className="w-full" compact />
        ) : null}

        {!isUser && onRate ? (
          <FeedbackControl
            message={message}
            disabled={feedbackPending}
            onRate={(rating, comment) => onRate(rating, comment)}
          />
        ) : null}
      </div>
    </article>
  )
}
