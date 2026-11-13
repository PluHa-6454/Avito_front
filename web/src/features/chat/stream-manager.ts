import { createStore, type StoreApi } from 'zustand/vanilla'

import { sendMessageStream } from '@/shared/api/endpoints'
import { ApiError, isApiError } from '@/shared/api/errors'
import type {
  ActionResult,
  ActionStatus,
  ActionType,
  Source,
  SseEvent,
  SseEventName,
} from '@/shared/api/schemas'
import { SseProtocolError, parseSseStream } from '@/shared/api/sse'
import { createId } from '@/shared/lib/id'

export type StreamPhase = 'idle' | 'connecting' | 'streaming' | 'done' | 'error' | 'cancelled'

export type StreamActionDraft = {
  actionId: string
  type: ActionType
  fields: Record<string, unknown>
}

export type StreamActionResult = {
  actionId: string
  status: ActionStatus
  result: ActionResult | null
}

export type StreamState = {
  phase: StreamPhase
  conversationId: string | null
  clientMessageId: string | null
  assistantMessageId: string | null
  requestText: string
  text: string
  stage: string | null
  statusText: string | null
  sources: Source[]
  drafts: Record<string, StreamActionDraft>
  results: Record<string, StreamActionResult>
  error: ApiError | null
  startedAt: number | null
  finishedAt: number | null
}

type StartStreamInput = {
  conversationId: string
  text: string
  clientMessageId?: string
  signal?: AbortSignal
}

type StreamManagerDeps = {
  send: typeof sendMessageStream
  flushDelayMs?: number
}

type StreamListener = (event: SseEvent) => void

function createInitialState(): StreamState {
  return {
    phase: 'idle',
    conversationId: null,
    clientMessageId: null,
    assistantMessageId: null,
    requestText: '',
    text: '',
    stage: null,
    statusText: null,
    sources: [],
    drafts: {},
    results: {},
    error: null,
    startedAt: null,
    finishedAt: null,
  }
}

function toStreamError(error: unknown): ApiError {
  if (isApiError(error)) {
    return error
  }

  if (error instanceof SseProtocolError) {
    return new ApiError({
      code: error.code === 'INVALID_EVENT' ? 'INVALID_RESPONSE' : 'NETWORK',
      message: error.message,
      details: error,
    })
  }

  return new ApiError({
    code: 'NETWORK',
    message: 'Не удалось получить ответ',
    details: error,
  })
}

export class StreamManager {
  readonly store: StoreApi<StreamState>

  private readonly deps: StreamManagerDeps
  private abortController: AbortController | null = null
  private pendingText = ''
  private flushTimer: ReturnType<typeof setTimeout> | null = null
  private readonly listeners = new Map<SseEventName, Set<StreamListener>>()

  constructor(deps: Partial<StreamManagerDeps> = {}) {
    this.deps = {
      send: deps.send ?? sendMessageStream,
      flushDelayMs: deps.flushDelayMs ?? 40,
    }
    this.store = createStore<StreamState>(() => createInitialState())
  }

  getState(): StreamState {
    return this.store.getState()
  }

  subscribe(listener: (state: StreamState) => void) {
    return this.store.subscribe(listener)
  }

  on(eventName: SseEventName, listener: StreamListener): () => void {
    const listeners = this.listeners.get(eventName) ?? new Set<StreamListener>()
    listeners.add(listener)
    this.listeners.set(eventName, listeners)

    return () => {
      listeners.delete(listener)
    }
  }

  async start(input: StartStreamInput): Promise<void> {
    const phase = this.getState().phase

    if (phase === 'connecting' || phase === 'streaming') {
      throw new Error('Стрим уже идёт')
    }

    this.reset()

    const clientMessageId = input.clientMessageId ?? createId()
    const controller = new AbortController()
    this.abortController = controller

    const signal = input.signal
      ? AbortSignal.any([controller.signal, input.signal])
      : controller.signal

    this.store.setState({
      phase: 'connecting',
      conversationId: input.conversationId,
      clientMessageId,
      requestText: input.text,
      startedAt: Date.now(),
    })

    try {
      const response = await this.deps.send(
        input.conversationId,
        { text: input.text, client_message_id: clientMessageId },
        signal,
      )

      if (!response.body) {
        throw new SseProtocolError('STREAM_CLOSED', 'Сервер вернул пустой поток')
      }

      this.store.setState({ phase: 'streaming' })

      await parseSseStream(response.body, {
        signal,
        onEvent: (event) => this.handleEvent(event),
      })

      this.flushText()

      if (this.getState().phase === 'streaming') {
        this.store.setState({ phase: 'done', finishedAt: Date.now() })
      }
    } catch (error) {
      this.flushText()

      if (this.getState().phase === 'cancelled') {
        return
      }

      this.store.setState({
        phase: 'error',
        error: toStreamError(error),
        finishedAt: Date.now(),
      })
    } finally {
      this.abortController = null
    }
  }

  cancel(): void {
    if (!this.abortController) {
      return
    }

    this.abortController.abort()
    this.abortController = null
    this.flushText()
    this.store.setState({ phase: 'cancelled', finishedAt: Date.now() })
  }

  reset(): void {
    this.abortController?.abort()
    this.abortController = null

    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }

    this.pendingText = ''
    this.store.setState(createInitialState(), true)
  }

  private handleEvent(event: SseEvent): void {
    switch (event.type) {
      case 'status':
        this.store.setState({ stage: event.data.stage, statusText: event.data.text })
        break
      case 'token':
        this.queueText(event.data.text)
        break
      case 'sources':
        this.store.setState({ sources: event.data.items })
        break
      case 'action_draft':
        this.store.setState((state) => ({
          drafts: {
            ...state.drafts,
            [event.data.action_id]: {
              actionId: event.data.action_id,
              type: event.data.type,
              fields: event.data.fields,
            },
          },
        }))
        break
      case 'action_result':
        this.store.setState((state) => ({
          results: {
            ...state.results,
            [event.data.action_id]: {
              actionId: event.data.action_id,
              status: event.data.status,
              result: event.data.result ?? null,
            },
          },
        }))
        this.emit(event)
        break
      case 'error':
        this.flushText()
        this.store.setState({
          phase: 'error',
          error: new ApiError({
            code: event.data.code,
            message: event.data.message,
          }),
          finishedAt: Date.now(),
        })
        this.emit(event)
        break
      case 'done':
        this.flushText()
        this.store.setState({
          phase: 'done',
          assistantMessageId: event.data.message_id,
          finishedAt: Date.now(),
        })
        this.emit(event)
        break
    }
  }

  private emit(event: SseEvent) {
    const listeners = this.listeners.get(event.type)

    if (!listeners) {
      return
    }

    for (const listener of listeners) {
      listener(event)
    }
  }

  private queueText(text: string) {
    this.pendingText += text

    if (this.flushTimer) {
      return
    }

    this.flushTimer = setTimeout(() => {
      this.flushTimer = null
      this.flushText()
    }, this.deps.flushDelayMs)
  }

  private flushText() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }

    if (!this.pendingText) {
      return
    }

    const chunk = this.pendingText
    this.pendingText = ''
    this.store.setState((state) => ({ text: state.text + chunk }))
  }
}

export const streamManager = new StreamManager()
