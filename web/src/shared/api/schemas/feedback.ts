import { z } from 'zod'

import { FeedbackRatingSchema, FeedbackSchema } from './message'

export const FeedbackRequestSchema = z.object({
  rating: FeedbackRatingSchema,
  comment: z.string().max(1000).nullish(),
})

export type FeedbackRequest = z.infer<typeof FeedbackRequestSchema>

export const FeedbackResponseSchema = z.object({
  feedback: FeedbackSchema,
})

export type FeedbackResponse = z.infer<typeof FeedbackResponseSchema>
