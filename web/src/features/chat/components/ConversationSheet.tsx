import { History, MessageSquarePlus, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import type { Conversation } from '@/shared/api/schemas'
import { formatDate } from '@/shared/lib/format'

type ConversationSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversations: Conversation[]
  activeId: string | null
  loading?: boolean
  creating?: boolean
  onSelect: (conversationId: string) => void
  onCreate: () => void
}

export function ConversationSheet({
  open,
  onOpenChange,
  conversations,
  activeId,
  loading,
  creating,
  onSelect,
  onCreate,
}: ConversationSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="flex w-full flex-col gap-0 sm:max-w-sm">
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2">
            <History className="size-4" aria-hidden="true" />
            Диалоги
          </SheetTitle>
          <SheetDescription>
            История вопросов и ответов. Новый диалог не удаляет предыдущие.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {loading ? (
            <p className="px-2 py-4 text-sm text-muted-foreground">Загружаем диалоги…</p>
          ) : conversations.length === 0 ? (
            <p className="px-2 py-4 text-sm text-muted-foreground">
              Пока нет диалогов. Начните новый.
            </p>
          ) : (
            <ul className="space-y-1" aria-label="Список диалогов">
              {conversations.map((conversation) => {
                const isActive = conversation.id === activeId

                return (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(conversation.id)}
                      aria-current={isActive ? 'true' : undefined}
                      className={cn(
                        'w-full rounded-lg px-3 py-2.5 text-left transition-colors',
                        'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                        isActive
                          ? 'bg-accent text-accent-foreground'
                          : 'hover:bg-muted text-foreground',
                      )}
                    >
                      <span className="block truncate text-sm font-medium">{conversation.title}</span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        Обновлён {formatDate(conversation.updated_at)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="border-t p-3">
          <Button type="button" className="w-full" onClick={onCreate} disabled={creating}>
            <Plus className="size-4" aria-hidden="true" />
            {creating ? 'Создаём…' : 'Новый диалог'}
          </Button>
          <p className="mt-2 flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
            <MessageSquarePlus className="size-3.5" aria-hidden="true" />
            Данные синтетические
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
