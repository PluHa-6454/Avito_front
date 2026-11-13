import { z } from 'zod'

export const ErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'ACTION_NOT_ALLOWED',
  'RATE_LIMITED',
  'INTERNAL',
  'LLM_UNAVAILABLE',
])

export type ErrorCode = z.infer<typeof ErrorCodeSchema>

export const ErrorDetailSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string(),
  hint: z.string().nullish(),
  request_id: z.string(),
})

export type ErrorDetail = z.infer<typeof ErrorDetailSchema>

export const ErrorResponseSchema = z.object({
  error: ErrorDetailSchema,
})

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>
