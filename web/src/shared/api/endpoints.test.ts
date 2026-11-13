import { beforeEach, describe, expect, it } from 'vitest'

import { createId } from '@/shared/lib/id'

import { parseSseStream } from './sse'
import type { SseEvent } from './schemas'
import { createConversation, login, sendMessageStream } from './endpoints'
import { clearAuthToken, setAuthToken } from './token'

describe('контракт сообщений через mock API', () => {
  beforeEach(() => {
    clearAuthToken()
  })

  it('возвращает SSE с источниками и терминальным done', async () => {
    const session = await login('intern@test.local')
    setAuthToken(session.token)

    const conversation = await createConversation('Контрактный тест')
    const response = await sendMessageStream(conversation.id, {
      text: 'Как устроено код-ревью?',
      client_message_id: createId(),
    })

    expect(response.headers.get('content-type')).toContain('text/event-stream')
    expect(response.body).not.toBeNull()

    const events: SseEvent[] = []

    await parseSseStream(response.body!, {
      onEvent: (event) => events.push(event),
    })

    expect(events.map((event) => event.type)).toContain('sources')
    expect(events.map((event) => event.type)).toContain('token')
    expect(events.at(-1)).toEqual({
      type: 'done',
      data: { message_id: expect.any(String) },
    })
  })

  it('возвращает action_draft для запроса отгула', async () => {
    const session = await login('intern@test.local')
    setAuthToken(session.token)

    const conversation = await createConversation()
    const response = await sendMessageStream(conversation.id, {
      text: 'Хочу отгул в пятницу',
      client_message_id: createId(),
    })

    const events: SseEvent[] = []

    await parseSseStream(response.body!, {
      onEvent: (event) => events.push(event),
    })

    const draft = events.find((event) => event.type === 'action_draft')

    expect(draft).toMatchObject({
      type: 'action_draft',
      data: { type: 'absence.create' },
    })
  })
})
