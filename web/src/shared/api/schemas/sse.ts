import { z } from 'zod'

import { ActionStatusSchema, ActionTypeSchema, ActionResultSchema } from './action'
import { ErrorCodeSchema } from './common'
import { SourceSchema } from './message'

export const SseStatusEventSchema = z.object({
  stage: z.string(),
  text: z.string(),
})

export type SseStatusEvent = z.infer<typeof SseStatusEventSchema>

export const SseTokenEventSchema = z.object({
  text: z.string(),
})

export type SseTokenEvent = z.infer<typeof SseTokenEventSchema>

export const SseSourcesEventSchema = z.object({
  items: z.array(SourceSchema),
})

export type SseSourcesEvent = z.infer<typeof SseSourcesEventSchema>

export const SseActionDraftEventSchema = z.object({
  action_id: z.string(),
  type: ActionTypeSchema,
  fields: z.record(z.string(), z.unknown()),
})

export type SseActionDraftEvent = z.infer<typeof SseActionDraftEventSchema>

export const SseActionResultEventSchema = z.object({
  action_id: z.string(),
  status: ActionStatusSchema,
  result: ActionResultSchema.nullish(),
})

export type SseActionResultEvent = z.infer<typeof SseActionResultEventSchema>

export const SseErrorEventSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string(),
})

export type SseErrorEvent = z.infer<typeof SseErrorEventSchema>

export const SseDoneEventSchema = z.object({
  message_id: z.string(),
})

export type SseDoneEvent = z.infer<typeof SseDoneEventSchema>

export const sseEventSchemas = {
  status: SseStatusEventSchema,
  token: SseTokenEventSchema,
  sources: SseSourcesEventSchema,
  action_draft: SseActionDraftEventSchema,
  action_result: SseActionResultEventSchema,
  error: SseErrorEventSchema,
  done: SseDoneEventSchema,
} as const

export type SseEventName = keyof typeof sseEventSchemas

export type SseEvent = {
  [K in SseEventName]: {
    type: K
    data: z.infer<(typeof sseEventSchemas)[K]>
  }
}[SseEventName]

export type SseEventOf<K extends SseEventName> = Extract<SseEvent, { type: K }>

export const TERMINAL_SSE_EVENTS: ReadonlySet<SseEventName> = new Set(['done', 'error'])

export function isSseEventName(name: string): name is SseEventName {
  return Object.hasOwn(sseEventSchemas, name)
}
