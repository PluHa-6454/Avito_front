import { z } from 'zod'

export const SourceSchema = z.object({
  doc_id: z.string(),
  title: z.string(),
  synthetic: z.boolean(),
})

export type Source = z.infer<typeof SourceSchema>

export const MessageRoleSchema = z.enum(['user', 'assistant'])

export type MessageRole = z.infer<typeof MessageRoleSchema>

export const MessageStatusSchema = z.enum(['streaming', 'done', 'error'])

export type MessageStatus = z.infer<typeof MessageStatusSchema>

export const FeedbackRatingSchema = z.enum(['up', 'down'])

export type FeedbackRating = z.infer<typeof FeedbackRatingSchema>

export const FeedbackSchema = z.object({
  id: z.string(),
  message_id: z.string(),
  rating: FeedbackRatingSchema,
  comment: z.string().max(1000).nullish(),
  created_at: z.iso.datetime(),
})

export type Feedback = z.infer<typeof FeedbackSchema>

export const MessageSchema = z.object({
  id: z.string(),
  conversation_id: z.string(),
  role: MessageRoleSchema,
  text: z.string(),
  status: MessageStatusSchema,
  sources: z.array(SourceSchema),
  created_at: z.iso.datetime(),
  feedback: FeedbackSchema.nullish(),
  client_message_id: z.string().nullish(),
})

export type Message = z.infer<typeof MessageSchema>

export const MessageListSchema = z.object({
  items: z.array(MessageSchema),
})

export type MessageList = z.infer<typeof MessageListSchema>

export const SendMessageRequestSchema = z.object({
  text: z.string().min(1).max(4000),
  client_message_id: z.uuid(),
})

export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>
