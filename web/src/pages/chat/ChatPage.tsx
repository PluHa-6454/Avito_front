import { History, MessageSquareText, Plus, ShieldCheck, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ActionCardList } from '@/features/actions/components/ActionCard'
import { RecentActionsCard } from '@/features/actions/components/RecentActionsCard'
import { ChatComposer } from '@/features/chat/components/ChatComposer'
import { ChatEmptyState } from '@/features/chat/components/ChatEmptyState'
import { ConversationSheet } from '@/features/chat/components/ConversationSheet'
import { MessageBubble } from '@/features/chat/components/MessageBubble'
import { StreamingBubble } from '@/features/chat/components/StreamingBubble'
import {
  chatKeys,
  useConversations,
  useCreateConversation,
  useMessages,
  useSendFeedback,
} from '@/features/chat/queries'
import { streamManager } from '@/features/chat/stream-manager'
import { useChatStream } from '@/features/chat/use-chat-stream'
import { OnboardingPanel } from '@/features/onboarding/components/OnboardingPanel'
import { useOnboarding } from '@/features/onboarding/queries'
import { getUserMessage, isApiError } from '@/shared/api/errors'
import type { FeedbackRating, Message } from '@/shared/api/schemas'
import { ErrorState } from '@/shared/components/ErrorState'
import { LoadingState } from '@/shared/components/LoadingState'
import { PageHeader } from '@/shared/components/PageHeader'
import { SyntheticBadge } from '@/shared/components/SyntheticBadge'
import { createId } from '@/shared/lib/id'

const ACTIVE_PHASES = new Set(['connecting', 'streaming'])

function useRetryCountdown(retryAfter: number | null, from: number | null): number {
  const [now, setNow] = useState(0)

  useEffect(() => {
    if (!retryAfter || retryAfter <= 0) {
      return
    }

    const tick = () => setNow(Date.now())
    const timer = window.setInterval(tick, 1000)
    const kickoff = window.setTimeout(tick, 0)

    return () => {
      window.clearInterval(timer)
      window.clearTimeout(kickoff)
    }
  }, [retryAfter, from])

  if (!retryAfter || retryAfter <= 0) {
    return 0
  }

  const reference = from ?? now

  if (!reference) {
    return retryAfter
  }

  const until = reference + retryAfter * 1000
  const current = now || reference

  return Math.max(0, Math.ceil((until - current) / 1000))
}

export function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const conversationParam = searchParams.get('conversation')
  const queryClient = useQueryClient()

  const conversationsQuery = useConversations()
  const conversations = conversationsQuery.data?.items ?? []
  const firstConversationId = conversations[0]?.id
  const activeId = conversationParam ?? firstConversationId ?? null

  const messagesQuery = useMessages(activeId)
  const messages = messagesQuery.data?.items ?? []

  const createConversation = useCreateConversation()
  const sendFeedback = useSendFeedback()
  const stream = useChatStream()
  const onboardingQuery = useOnboarding()

  const [draft, setDraft] = useState(() => {
    const prefill = (location.state as { prefill?: string } | null)?.prefill
    return prefill ?? ''
  })
  const [sheetOpen, setSheetOpen] = useState(false)
  const [feedbackMessageId, setFeedbackMessageId] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const prefill = (location.state as { prefill?: string } | null)?.prefill

    if (!prefill) {
      return
    }

    window.requestAnimationFrame(() => inputRef.current?.focus())
    navigate(
      { pathname: location.pathname, search: location.search },
      { replace: true, state: null },
    )
  }, [location, navigate])

  const isStreaming = ACTIVE_PHASES.has(stream.phase)
  const streamForActive = stream.conversationId === activeId
  const streamActiveElsewhere = isStreaming && stream.conversationId !== activeId

  const activeConversation = conversations.find((conversation) => conversation.id === activeId)
  const conversationTitle = activeConversation?.title ?? 'Диалог'

  const showStreamUser =
    streamForActive &&
    stream.requestText.length > 0 &&
    !messages.some((message) => message.client_message_id === stream.clientMessageId) &&
    (isStreaming || stream.phase === 'error' || stream.phase === 'done')

  const showStreamAssistant =
    streamForActive &&
    (isStreaming ||
      stream.phase === 'error' ||
      (stream.phase === 'done' &&
        Boolean(stream.assistantMessageId) &&
        !messages.some((message) => message.id === stream.assistantMessageId)))

  const retryAfter = isApiError(stream.error) ? stream.error.retryAfter : null
  const retrySeconds = useRetryCountdown(retryAfter, stream.finishedAt)

  const streamActions = streamForActive
    ? Object.values(stream.drafts).map((draft) => ({
        ...draft,
        status: stream.results[draft.actionId]?.status,
        result: stream.results[draft.actionId]?.result,
      }))
    : []

  const pendingUserMessage: Message | null =
    showStreamUser && activeId
      ? {
          id: `pending:${stream.clientMessageId}`,
          conversation_id: activeId,
          role: 'user',
          text: stream.requestText,
          status: 'done',
          sources: [],
          created_at: stream.startedAt ? new Date(stream.startedAt).toISOString() : '',
          feedback: null,
          client_message_id: stream.clientMessageId,
        }
      : null

  useEffect(() => {
    if (conversationParam || !firstConversationId) {
      return
    }

    setSearchParams({ conversation: firstConversationId }, { replace: true })
  }, [conversationParam, firstConversationId, setSearchParams])

  useEffect(() => {
    let previous = streamManager.getState()

    return streamManager.subscribe((state) => {
      const wasTerminal =
        previous.phase === 'done' || previous.phase === 'error' || previous.phase === 'cancelled'
      const isTerminal =
        state.phase === 'done' || state.phase === 'error' || state.phase === 'cancelled'

      if (isTerminal && !wasTerminal) {
        if (state.conversationId) {
          void queryClient.invalidateQueries({
            queryKey: chatKeys.messages(state.conversationId),
          })
        }

        void queryClient.invalidateQueries({ queryKey: chatKeys.conversations })
      }

      previous = state
    })
  }, [queryClient])

  useEffect(() => {
    return streamManager.on('action_result', () => {
      void queryClient.invalidateQueries({ queryKey: ['actions'] })
      void queryClient.invalidateQueries({ queryKey: ['onboarding'] })
    })
  }, [queryClient])

  const streamTextLength = streamForActive ? stream.text.length : 0

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length, streamTextLength, stream.phase, activeId])

  async function ensureConversation(): Promise<string> {
    if (activeId) {
      return activeId
    }

    const created = await createConversation.mutateAsync(undefined)
    setSearchParams({ conversation: created.id }, { replace: true })

    return created.id
  }

  async function handleSend(text: string) {
    const trimmed = text.trim()

    if (!trimmed || isStreaming) {
      return
    }

    try {
      const conversationId = await ensureConversation()
      setDraft('')
      void streamManager.start({
        conversationId,
        text: trimmed,
        clientMessageId: createId(),
      })
      window.requestAnimationFrame(() => inputRef.current?.focus())
    } catch (error) {
      toast.error(getUserMessage(error))
    }
  }

  function handleRetry() {
    const current = streamManager.getState()

    if (!current.conversationId || !current.requestText || !current.clientMessageId) {
      return
    }

    void streamManager.start({
      conversationId: current.conversationId,
      text: current.requestText,
      clientMessageId: current.clientMessageId,
    })
  }

  function handleStop() {
    const conversationId = streamManager.getState().conversationId
    streamManager.cancel()

    if (conversationId) {
      window.setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: chatKeys.messages(conversationId) })
      }, 250)
    }
  }

  async function handleCreateConversation() {
    try {
      const created = await createConversation.mutateAsync(undefined)
      setSheetOpen(false)
      setSearchParams({ conversation: created.id }, { replace: true })
      window.requestAnimationFrame(() => inputRef.current?.focus())
    } catch (error) {
      toast.error(getUserMessage(error))
    }
  }

  async function handleRate(message: Message, rating: FeedbackRating, comment?: string) {
    if (!activeId) {
      return
    }

    setFeedbackMessageId(message.id)

    try {
      await sendFeedback.mutateAsync({
        conversationId: activeId,
        messageId: message.id,
        body: { rating, comment },
      })
    } catch (error) {
      toast.error(getUserMessage(error))
    } finally {
      setFeedbackMessageId(null)
    }
  }

  function handleSelectConversation(conversationId: string) {
    setSearchParams({ conversation: conversationId }, { replace: true })
    setSheetOpen(false)
  }

  function handlePrefill(prefill: string) {
    setDraft(prefill)
    window.requestAnimationFrame(() => inputRef.current?.focus())
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Чат с наставником"
        description="Вопросы по базе знаний команды, заявки и следующие шаги адаптации."
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => setSheetOpen(true)}>
              <History className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Диалоги</span>
            </Button>
            <Button
              type="button"
              onClick={() => void handleCreateConversation()}
              disabled={createConversation.isPending}
            >
              <Plus className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Новый диалог</span>
            </Button>
          </>
        }
      />

      {streamActiveElsewhere ? (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-info/30 bg-info/10 px-4 py-2.5 text-sm text-foreground"
        >
          <span className="flex items-center gap-2">
            <Sparkles className="size-4 text-info" aria-hidden="true" />
            AI-buddy отвечает в другом диалоге. Ответ продолжится, даже если вы останетесь здесь.
          </span>
          <Button
            type="button"
            variant="link"
            className="h-auto p-0"
            onClick={() => {
              if (stream.conversationId) {
                setSearchParams({ conversation: stream.conversationId }, { replace: true })
              }
            }}
          >
            Перейти к диалогу
          </Button>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="flex h-[calc(100svh-15rem)] min-h-[480px] max-h-[760px] flex-col overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-3 border-b">
            <div className="min-w-0">
              <CardTitle className="truncate">{conversationTitle}</CardTitle>
              <CardDescription className="mt-1 flex items-center gap-2">
                <MessageSquareText className="size-3.5" aria-hidden="true" />
                Ответы по документам команды
              </CardDescription>
            </div>
            <SyntheticBadge label="mock" className="shrink-0" />
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            <div
              className="min-h-0 flex-1 overflow-y-auto px-4 py-5 lg:px-6"
              role="log"
              aria-label="Сообщения диалога"
            >
              {messagesQuery.isPending && activeId ? (
                <LoadingState label="Загружаем сообщения" />
              ) : messagesQuery.isError ? (
                <ErrorState
                  error={messagesQuery.error}
                  title="Не удалось загрузить сообщения"
                  onRetry={() => void messagesQuery.refetch()}
                />
              ) : !activeId ? (
                <ChatEmptyState
                  disabled={isStreaming}
                  onPrompt={(prompt) => void handleSend(prompt)}
                />
              ) : (
                <div className="space-y-5">
                  {messages.length === 0 && !showStreamUser ? (
                    <ChatEmptyState
                      disabled={isStreaming}
                      onPrompt={(prompt) => void handleSend(prompt)}
                    />
                  ) : null}

                  {messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      feedbackPending={feedbackMessageId === message.id}
                      onRate={
                        message.role === 'assistant'
                          ? (rating, comment) => void handleRate(message, rating, comment)
                          : undefined
                      }
                    />
                  ))}

                  {pendingUserMessage ? (
                    <MessageBubble key={pendingUserMessage.id} message={pendingUserMessage} />
                  ) : null}

                  {showStreamAssistant ? (
                    <StreamingBubble
                      stream={stream}
                      retrySeconds={retrySeconds}
                      onRetry={handleRetry}
                    />
                  ) : null}

                  <ActionCardList actions={streamActions} onEdit={handlePrefill} />

                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            <ChatComposer
              value={draft}
              onChange={setDraft}
              onSend={() => void handleSend(draft)}
              onStop={handleStop}
              streaming={isStreaming}
              disabled={messagesQuery.isError || streamActiveElsewhere}
              inputRef={inputRef}
              autoFocus
            />
          </CardContent>
        </Card>

        <aside className="space-y-4">
          <OnboardingPanel
            onboarding={onboardingQuery.data}
            isLoading={onboardingQuery.isPending}
            error={onboardingQuery.isError ? onboardingQuery.error : undefined}
            startDisabled={isStreaming}
            onRetry={() => void onboardingQuery.refetch()}
            onStart={handlePrefill}
          />

          <RecentActionsCard />

          <p className="flex items-start gap-2 px-1 text-[11px] leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden="true" />
            Ответы ограничены правами вашей роли и команды. Все сотрудники, команды и инструкции
            синтетические.
          </p>
        </aside>
      </div>

      <ConversationSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        conversations={conversations}
        activeId={activeId}
        loading={conversationsQuery.isPending}
        creating={createConversation.isPending}
        onSelect={handleSelectConversation}
        onCreate={() => void handleCreateConversation()}
      />
    </div>
  )
}
