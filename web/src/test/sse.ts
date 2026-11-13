import type { SseEvent } from '@/shared/api/schemas'

export function encodeSseEvent(event: SseEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`
}

export function sseText(events: SseEvent[]): string {
  return events.map(encodeSseEvent).join('')
}

export function sseBody(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }

      controller.close()
    },
  })
}

export function sseResponse(chunks: string[]): Response {
  return new Response(sseBody(chunks), {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  })
}
