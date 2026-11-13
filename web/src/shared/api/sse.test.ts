import { describe, expect, it, vi } from 'vitest'

import type { SseEvent } from './schemas'
import { SseParser, SseProtocolError, parseSseStream } from './sse'
import { sseBody } from '@/test/sse'

const doneEvent: SseEvent = { type: 'done', data: { message_id: 'msg_1' } }

describe('SSE-парсер', () => {
  it('разбирает CRLF, комментарии и многострочный data', () => {
    const parser = new SseParser()
    const events = parser.push(
      ': keep-alive\r\n\r\n' +
        'event: status\r\n' +
        'data: {"stage":"kb_search",\r\n' +
        'data: "text":"ищу в базе"}\r\n\r\n' +
        'event: done\r\n' +
        'data: {"message_id":"msg_1"}\r\n\r\n',
    )

    expect(events).toEqual([
      { type: 'status', data: { stage: 'kb_search', text: 'ищу в базе' } },
      doneEvent,
    ])
    expect(parser.isTerminal).toBe(true)
  })

  it('игнорирует неизвестные события', () => {
    const parser = new SseParser()
    const events = parser.push(
      'event: unknown\ndata: {"x":1}\n\n' +
        'event: done\ndata: {"message_id":"msg_1"}\n\n',
    )

    expect(events).toEqual([doneEvent])
  })

  it('игнорирует события после терминального', () => {
    const parser = new SseParser()
    const events = parser.push(
      'event: done\ndata: {"message_id":"msg_1"}\n\n' +
        'event: token\ndata: {"text":"лишний"}\n\n',
    )

    expect(events).toEqual([doneEvent])
  })

  it('падает, если поток закрылся без терминального события', () => {
    const parser = new SseParser()
    parser.push('event: token\ndata: {"text":"начало"}\n\n')

    expect(() => parser.finish()).toThrowError(SseProtocolError)
  })

  it('падает на некорректном событии', () => {
    const parser = new SseParser()

    expect(() => parser.push('event: token\ndata: {"wrong":true}\n\n')).toThrowError(
      /не соответствует контракту/,
    )
  })

  it('собирает события из потока, разбитого на куски', async () => {
    const stream = sseBody([
      'event: status\ndata: {"stage":"kb_search","text":"ищу"}\n\n' +
        'event: token\ndata: {"text":"Ответ"}\n\nevent: done\ndata: {"message_id":"msg_1"}\n\n',
    ])
    const events: SseEvent[] = []

    await parseSseStream(stream, { onEvent: (event) => events.push(event) })

    expect(events.map((event) => event.type)).toEqual(['status', 'token', 'done'])
  })

  it('переносит CRLF через границу чанков', () => {
    const parser = new SseParser()
    const events = [
      ...parser.push('event: token\r'),
      ...parser.push('\ndata: {"text":"а"}\r\n\r'),
      ...parser.push('\nevent: done\r\ndata: {"message_id":"msg_1"}\r\n\r\n'),
    ]

    expect(events).toEqual([
      { type: 'token', data: { text: 'а' } },
      doneEvent,
    ])
  })

  it('не читает поток, если сигнал уже отменён', async () => {
    const controller = new AbortController()
    controller.abort()

    await expect(
      parseSseStream(sseBody([]), { signal: controller.signal, onEvent: vi.fn() }),
    ).rejects.toMatchObject({ code: 'ABORTED' })
  })
})
