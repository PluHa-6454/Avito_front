import { useState } from 'react'
import { MessageSquarePlus, ThumbsDown, ThumbsUp } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { FeedbackRating, Message } from '@/shared/api/schemas'

type FeedbackControlProps = {
  message: Message
  disabled?: boolean
  onRate: (rating: FeedbackRating, comment?: string) => void
}

export function FeedbackControl({ message, disabled, onRate }: FeedbackControlProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [comment, setComment] = useState('')
  const current = message.feedback?.rating

  function submitDown() {
    onRate('down', comment.trim() || undefined)
    setDialogOpen(false)
    setComment('')
  }

  return (
    <div className="flex items-center gap-1">
      <span className="mr-1 text-[11px] text-muted-foreground">
        {current ? 'Спасибо за оценку' : 'Ответ полезен?'}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn('size-7', current === 'up' && 'bg-success/10 text-success')}
        aria-label="Ответ полезен"
        aria-pressed={current === 'up'}
        disabled={disabled}
        onClick={() => onRate('up')}
      >
        <ThumbsUp className="size-3.5" aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn('size-7', current === 'down' && 'bg-destructive/10 text-destructive')}
        aria-label="Ответ не помог"
        aria-pressed={current === 'down'}
        disabled={disabled}
        onClick={() => setDialogOpen(true)}
      >
        <ThumbsDown className="size-3.5" aria-hidden="true" />
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Что не так с ответом?</DialogTitle>
            <DialogDescription>
              Комментарий необязателен, но помогает наставнику улучшить базу знаний.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="feedback-comment" className="text-sm font-medium text-foreground">
              Комментарий
            </label>
            <Textarea
              id="feedback-comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="Например: не хватило ссылки на регламент"
            />
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <MessageSquarePlus className="size-3.5" aria-hidden="true" />
              Оценка сохранится сразу после отправки.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button type="button" onClick={submitDown} disabled={disabled}>
              Отправить оценку
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
