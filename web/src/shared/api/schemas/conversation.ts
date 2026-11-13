import { z } from 'zod'

export const ConversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
})

export type Conversation = z.infer<typeof ConversationSchema>

export const ConversationListSchema = z.object({
  items: z.array(ConversationSchema),
})

export type ConversationList = z.infer<typeof ConversationListSchema>

export const CreateConversationRequestSchema = z.object({
  title: z.string().max(200).optional(),
})

export type CreateConversationRequest = z.infer<typeof CreateConversationRequestSchema>
