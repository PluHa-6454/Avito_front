import { z } from 'zod'

import { ErrorDetailSchema } from './common'

export const ActionTypeSchema = z.enum([
  'absence.create',
  'access.request',
  'tasks.transition',
  'mentor.ask',
])

export type ActionType = z.infer<typeof ActionTypeSchema>

export const ActionStatusSchema = z.enum([
  'draft',
  'confirmed',
  'executing',
  'done',
  'failed',
  'cancelled',
])

export type ActionStatus = z.infer<typeof ActionStatusSchema>

export const ActionEventSchema = z.object({
  status: ActionStatusSchema,
  at: z.iso.datetime(),
  note: z.string().nullish(),
})

export type ActionEvent = z.infer<typeof ActionEventSchema>

export const ActionResultSchema = z
  .record(z.string(), z.unknown())
  .describe('Типозависимый результат корпоративного сервиса')

export type ActionResult = z.infer<typeof ActionResultSchema>

export const ActionSchema = z.object({
  id: z.string(),
  type: ActionTypeSchema,
  status: ActionStatusSchema,
  fields: z.record(z.string(), z.unknown()),
  result: ActionResultSchema.nullish(),
  error: ErrorDetailSchema.nullish(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
  history: z.array(ActionEventSchema),
})

export type Action = z.infer<typeof ActionSchema>

export const ActionListSchema = z.object({
  items: z.array(ActionSchema),
})

export type ActionList = z.infer<typeof ActionListSchema>

export const ActionResponseSchema = z.object({
  action: ActionSchema,
})

export type ActionResponse = z.infer<typeof ActionResponseSchema>

export const ConflictResponseSchema = z.object({
  error: ErrorDetailSchema,
  action: ActionSchema.optional(),
})

export type ConflictResponse = z.infer<typeof ConflictResponseSchema>
