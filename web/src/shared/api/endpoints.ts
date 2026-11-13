import { apiFetch, apiFetchText, apiStream } from './client'
import {
  ActionListSchema,
  ActionResponseSchema,
  ActionSchema,
  ConversationListSchema,
  ConversationSchema,
  FeedbackResponseSchema,
  LoginResponseSchema,
  MessageListSchema,
  OnboardingSchema,
  SendMessageRequestSchema,
  UserSchema,
  type FeedbackRequest,
  type SendMessageRequest,
} from './schemas'

function pathSegment(value: string): string {
  return encodeURIComponent(value)
}

export function login(email: string) {
  return apiFetch({
    path: '/auth/login',
    method: 'POST',
    body: { email },
    schema: LoginResponseSchema,
  })
}

export function getMe(signal?: AbortSignal) {
  return apiFetch({ path: '/me', schema: UserSchema, signal })
}

export function listConversations(signal?: AbortSignal) {
  return apiFetch({ path: '/conversations', schema: ConversationListSchema, signal })
}

export function createConversation(title?: string) {
  return apiFetch({
    path: '/conversations',
    method: 'POST',
    body: title ? { title } : {},
    schema: ConversationSchema,
  })
}

export function getConversation(conversationId: string, signal?: AbortSignal) {
  return apiFetch({
    path: `/conversations/${pathSegment(conversationId)}`,
    schema: ConversationSchema,
    signal,
  })
}

export function listMessages(conversationId: string, signal?: AbortSignal) {
  return apiFetch({
    path: `/conversations/${pathSegment(conversationId)}/messages`,
    schema: MessageListSchema,
    signal,
  })
}

export function sendMessageStream(
  conversationId: string,
  body: SendMessageRequest,
  signal?: AbortSignal,
) {
  const payload = SendMessageRequestSchema.parse(body)

  return apiStream({
    path: `/conversations/${pathSegment(conversationId)}/messages`,
    method: 'POST',
    body: payload,
    signal,
  })
}

export function listActions(signal?: AbortSignal) {
  return apiFetch({ path: '/actions', schema: ActionListSchema, signal })
}

export function getAction(actionId: string, signal?: AbortSignal) {
  return apiFetch({ path: `/actions/${pathSegment(actionId)}`, schema: ActionSchema, signal })
}

export function confirmAction(actionId: string, idempotencyKey: string) {
  return apiFetch({
    path: `/actions/${pathSegment(actionId)}/confirm`,
    method: 'POST',
    body: {},
    headers: { 'Idempotency-Key': idempotencyKey },
    schema: ActionResponseSchema,
  })
}

export function cancelAction(actionId: string) {
  return apiFetch({
    path: `/actions/${pathSegment(actionId)}/cancel`,
    method: 'POST',
    body: {},
    schema: ActionResponseSchema,
  })
}

export function getOnboarding(signal?: AbortSignal) {
  return apiFetch({ path: '/onboarding', schema: OnboardingSchema, signal })
}

export function sendFeedback(messageId: string, body: FeedbackRequest) {
  return apiFetch({
    path: `/messages/${pathSegment(messageId)}/feedback`,
    method: 'POST',
    body,
    schema: FeedbackResponseSchema,
  })
}

export function getHealth() {
  return apiFetchText('/healthz')
}
