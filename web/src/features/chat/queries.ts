import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'

import {
  createConversation,
  listConversations,
  listMessages,
  sendFeedback,
} from '@/shared/api/endpoints'
import type { Feedback, FeedbackRequest, MessageList } from '@/shared/api/schemas'

export const chatKeys = {
  conversations: ['conversations'] as const,
  messages: (conversationId: string) => ['messages', conversationId] as const,
}

export function useConversations() {
  return useQuery({
    queryKey: chatKeys.conversations,
    queryFn: ({ signal }) => listConversations(signal),
  })
}

export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: chatKeys.messages(conversationId ?? 'none'),
    queryFn: ({ signal }) => listMessages(conversationId as string, signal),
    enabled: Boolean(conversationId),
  })
}

export function useCreateConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (title?: string) => createConversation(title),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.conversations })
    },
  })
}

function updateMessageFeedback(
  queryClient: QueryClient,
  conversationId: string,
  messageId: string,
  feedback: Feedback | null,
) {
  queryClient.setQueryData<MessageList>(chatKeys.messages(conversationId), (current) => {
    if (!current) {
      return current
    }

    return {
      items: current.items.map((message) =>
        message.id === messageId ? { ...message, feedback } : message,
      ),
    }
  })
}

type FeedbackVariables = {
  conversationId: string
  messageId: string
  body: FeedbackRequest
}

export function useSendFeedback() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ messageId, body }: FeedbackVariables) => sendFeedback(messageId, body),
    onMutate: async ({ conversationId, messageId, body }) => {
      await queryClient.cancelQueries({ queryKey: chatKeys.messages(conversationId) })

      const previous = queryClient.getQueryData<MessageList>(chatKeys.messages(conversationId))
      const optimistic: Feedback = {
        id: `optimistic-feedback:${messageId}`,
        message_id: messageId,
        rating: body.rating,
        comment: body.comment ?? null,
        created_at: new Date().toISOString(),
      }

      updateMessageFeedback(queryClient, conversationId, messageId, optimistic)

      return { previous }
    },
    onError: (_error, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          chatKeys.messages(variables.conversationId),
          context.previous,
        )
      }
    },
    onSuccess: (data, variables) => {
      updateMessageFeedback(
        queryClient,
        variables.conversationId,
        variables.messageId,
        data.feedback,
      )
    },
  })
}
