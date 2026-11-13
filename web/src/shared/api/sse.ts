import {
  TERMINAL_SSE_EVENTS,
  isSseEventName,
  sseEventSchemas,
  type SseEvent,
  type SseEventName,
} from './schemas'

export type SseProtocolErrorCode = 'INVALID_EVENT' | 'STREAM_CLOSED' | 'ABORTED'

export class SseProtocolError extends Error {
  readonly code: SseProtocolErrorCode

  constructor(code: SseProtocolErrorCode, message: string) {
    super(message)
    this.name = 'SseProtocolError'
    this.code = code
  }
}

type ParsedEvent = SseEvent

export class SseParser {
  private buffer = ''
  private pendingCarriageReturn = false
  private terminalSeen = false

  get isTerminal(): boolean {
    return this.terminalSeen
  }

  push(chunk: string): ParsedEvent[] {
    let text = chunk

    if (this.pendingCarriageReturn) {
      text = `\r${text}`
      this.pendingCarriageReturn = false
    }

    if (text.endsWith('\r')) {
      this.pendingCarriageReturn = true
      text = text.slice(0, -1)
    }

    this.buffer += text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

    return this.drain(false)
  }

  finish(): ParsedEvent[] {
    if (this.pendingCarriageReturn) {
      this.buffer += '\r'
      this.pendingCarriageReturn = false
    }

    const events = this.drain(true)

    if (!this.terminalSeen) {
      throw new SseProtocolError(
        'STREAM_CLOSED',
        'Поток завершился без терминального события done или error',
      )
    }

    return events
  }

  private drain(final: boolean): ParsedEvent[] {
    const events: ParsedEvent[] = []
    let boundary = this.buffer.indexOf('\n\n')

    while (boundary !== -1) {
      const block = this.buffer.slice(0, boundary)
      this.buffer = this.buffer.slice(boundary + 2)
      this.emitBlock(block, events)
      boundary = this.buffer.indexOf('\n\n')
    }

    if (final && this.buffer.trim()) {
      this.emitBlock(this.buffer, events)
      this.buffer = ''
    }

    return events
  }

  private emitBlock(block: string, events: ParsedEvent[]) {
    const parsed = this.parseBlock(block)

    if (!parsed) {
      return
    }

    events.push(parsed)
  }

  private parseBlock(block: string): ParsedEvent | null {
    let eventName = 'message'
    const dataLines: string[] = []

    for (const line of block.split('\n')) {
      if (!line || line.startsWith(':')) {
        continue
      }

      const colonIndex = line.indexOf(':')
      const field = colonIndex === -1 ? line : line.slice(0, colonIndex)
      let value = colonIndex === -1 ? '' : line.slice(colonIndex + 1)

      if (value.startsWith(' ')) {
        value = value.slice(1)
      }

      if (field === 'event') {
        eventName = value
      } else if (field === 'data') {
        dataLines.push(value)
      }
    }

    if (dataLines.length === 0) {
      return null
    }

    if (this.terminalSeen) {
      return null
    }

    if (!isSseEventName(eventName)) {
      return null
    }

    const rawData = dataLines.join('\n')
    let json: unknown

    try {
      json = JSON.parse(rawData)
    } catch {
      throw new SseProtocolError(
        'INVALID_EVENT',
        `Событие ${eventName} содержит некорректный JSON`,
      )
    }

    const schema = sseEventSchemas[eventName]
    const validation = schema.safeParse(json)

    if (!validation.success) {
      throw new SseProtocolError(
        'INVALID_EVENT',
        `Событие ${eventName} не соответствует контракту`,
      )
    }

    if (TERMINAL_SSE_EVENTS.has(eventName as SseEventName)) {
      this.terminalSeen = true
    }

    return {
      type: eventName,
      data: validation.data,
    } as ParsedEvent
  }
}

type ParseSseStreamOptions = {
  signal?: AbortSignal
  onEvent: (event: SseEvent) => void
}

export async function parseSseStream(
  stream: ReadableStream<Uint8Array>,
  { signal, onEvent }: ParseSseStreamOptions,
): Promise<void> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  const parser = new SseParser()

  const emit = (events: SseEvent[]) => {
    for (const event of events) {
      onEvent(event)
    }
  }

  try {
    while (true) {
      if (signal?.aborted) {
        throw new SseProtocolError('ABORTED', 'Чтение потока отменено')
      }

      const { done, value } = await reader.read()

      if (done) {
        break
      }

      emit(parser.push(decoder.decode(value, { stream: true })))

      if (parser.isTerminal) {
        await reader.cancel().catch(() => undefined)
        return
      }
    }

    const tail = decoder.decode()

    if (tail) {
      emit(parser.push(tail))
    }

    emit(parser.finish())
  } catch (error) {
    if (signal?.aborted) {
      throw new SseProtocolError('ABORTED', 'Чтение потока отменено')
    }

    throw error
  } finally {
    reader.releaseLock()
  }
}
