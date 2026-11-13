import { afterEach, describe, expect, it, vi } from 'vitest'

import type { SseEvent } from '@/shared/api/schemas'
import { sseResponse, sseText } from '@/test/sse'

import { StreamManager } from './stream-manager'

function createManager(events: SseEvent[], overrides: ConstructorParameters<typeof StreamManager>[0] = {}) {
  const send = vi.fn().mockResolvedValue(sseResponse([sseText(events)]))

  return {
    send,
    manager: new StreamManager({ send, flushDelayMs: 0, ...overrides }),
  }
}

const done: SseEvent = { type: 'done', data: { message_id: 'msg_42' } }

describe('StreamManager', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('собирает текст, источники и завершает стрим', async () => {
    const events: SseEvent[] = [
      { type: 'status', data: { stage: 'kb_search', text: 'ищу в базе' } },
      { type: 'sources', data: { items: [{ doc_id: 'kb-001', title: 'Ревью', synthetic: true }] } },
      { type: 'token', data: { text: 'Привет' } },
      { type: 'token', data: { text: ', мир' } },
      done,
    ]
    const { manager } = createManager(events)

    await manager.start({ conversationId: 'conv_1', text: 'Как дела?' })

    expect(manager.getState()).toMatchObject({
      phase: 'done',
      text: 'Привет, мир',
      assistantMessageId: 'msg_42',
      statusText: 'ищу в базе',
    })
    expect(manager.getState().sources).toHaveLength(1)
  })

  it('переводит ошибку потока в состояние error', async () => {
    const events: SseEvent[] = [
      { type: 'status', data: { stage: 'llm', text: 'готовлю ответ' } },
      {
        type: 'error',
        data: { code: 'LLM_UNAVAILABLE', message: 'AI временно недоступен' },
      },
    ]
    const { manager } = createManager(events)

    await manager.start({ conversationId: 'conv_1', text: 'Ошибка' })

    expect(manager.getState().phase).toBe('error')
    expect(manager.getState().error).toMatchObject({
      code: 'LLM_UNAVAILABLE',
      message: 'AI временно недоступен',
    })
  })

  it('сохраняет черновики и результаты действий', async () => {
    const events: SseEvent[] = [
      {
        type: 'action_draft',
        data: {
          action_id: 'act_1',
          type: 'absence.create',
          fields: { date: '2026-11-20' },
        },
      },
      {
        type: 'action_result',
        data: {
          action_id: 'act_1',
          status: 'done',
          result: { number: 'ABS-1024' },
        },
      },
      done,
    ]
    const { manager } = createManager(events)
    const listener = vi.fn()
    manager.on('action_result', listener)

    await manager.start({ conversationId: 'conv_1', text: 'Отгул' })

    expect(manager.getState().drafts.act_1).toMatchObject({
      type: 'absence.create',
      fields: { date: '2026-11-20' },
    })
    expect(manager.getState().results.act_1).toMatchObject({
      status: 'done',
      result: { number: 'ABS-1024' },
    })
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('помечает стрим отменённым', async () => {
    const send = vi.fn().mockImplementation(
      (_conversationId: string, _body: unknown, signal: AbortSignal) =>
        new Promise<Response>((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'))
          })
        }),
    )
    const manager = new StreamManager({ send, flushDelayMs: 0 })

    const startPromise = manager.start({ conversationId: 'conv_1', text: 'Стоп' })
    manager.cancel()
    await startPromise

    expect(manager.getState().phase).toBe('cancelled')
  })
})
