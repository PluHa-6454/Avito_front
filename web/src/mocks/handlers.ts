import { HttpResponse, http } from 'msw'
import { z } from 'zod'

import {
  FeedbackRequestSchema,
  SendMessageRequestSchema,
  type ErrorCode,
  type SseEvent,
  type User,
} from '@/shared/api/schemas'

import { mockStore } from './core/store'
import {
  buildScenario,
  detectScenario,
  isScenarioName,
  scenarioAction,
  scenarioSources,
} from './scenarios'

const api = (path: string) => `*/api/v1${path}`

function errorResponse(status: number, code: ErrorCode, message: string, hint?: string) {
  return HttpResponse.json(
    {
      error: {
        code,
        message,
        hint: hint ?? null,
        request_id: `req_msw_${Math.random().toString(36).slice(2, 8)}`,
      },
    },
    { status },
  )
}

function userFromRequest(request: Request): User | null {
  const header = request.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''

  return mockStore.findUserByToken(token) ?? null
}

function requireUser(request: Request): User | Response {
  const user = userFromRequest(request)

  if (!user) {
    return errorResponse(401, 'UNAUTHORIZED', 'Сессия истекла', 'Войдите снова')
  }

  return user
}

function encodeFrame(event: SseEvent): Uint8Array {
  return new TextEncoder().encode(
    `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`,
  )
}

function sseResponse(steps: ReturnType<typeof buildScenario>['steps']) {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const step of steps) {
        if ('disconnect' in step) {
          controller.close()
          return
        }

        controller.enqueue(encodeFrame(step.event))
      }

      controller.close()
    },
  })

  return new HttpResponse(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  })
}

export const handlers = [
  http.get(api('/healthz'), () => HttpResponse.text('ok')),

  http.post(api('/auth/login'), async ({ request }) => {
    const body = z.object({ email: z.email() }).safeParse(await request.json())

    if (!body.success) {
      return errorResponse(400, 'VALIDATION_ERROR', 'Укажите корректный email')
    }

    const user = mockStore.findUserByEmail(body.data.email)

    if (!user) {
      return errorResponse(401, 'UNAUTHORIZED', 'Тестовый пользователь не найден')
    }

    return HttpResponse.json({ token: mockStore.issueToken(user), user })
  }),

  http.get(api('/me'), ({ request }) => {
    const user = requireUser(request)

    if (user instanceof Response) {
      return user
    }

    return HttpResponse.json(user)
  }),

  http.get(api('/conversations'), ({ request }) => {
    const user = requireUser(request)

    if (user instanceof Response) {
      return user
    }

    return HttpResponse.json({ items: mockStore.listConversations(user.id) })
  }),

  http.post(api('/conversations'), async ({ request }) => {
    const user = requireUser(request)

    if (user instanceof Response) {
      return user
    }

    const body = (await request.json().catch(() => ({}))) as { title?: unknown }
    const title = typeof body.title === 'string' ? body.title : undefined

    return HttpResponse.json(mockStore.createConversation(user.id, title), { status: 201 })
  }),

  http.get(api('/conversations/:conversationId'), ({ request, params }) => {
    const user = requireUser(request)

    if (user instanceof Response) {
      return user
    }

    const conversation = mockStore.findConversation(String(params.conversationId))

    if (!conversation) {
      return errorResponse(404, 'NOT_FOUND', 'Диалог не найден')
    }

    if (conversation.user_id !== user.id) {
      return errorResponse(403, 'FORBIDDEN', 'Нет доступа к этому диалогу')
    }

    const { user_id: _userId, ...publicConversation } = conversation

    return HttpResponse.json(publicConversation)
  }),

  http.get(api('/conversations/:conversationId/messages'), ({ request, params }) => {
    const user = requireUser(request)

    if (user instanceof Response) {
      return user
    }

    const conversation = mockStore.findConversation(String(params.conversationId))

    if (!conversation) {
      return errorResponse(404, 'NOT_FOUND', 'Диалог не найден')
    }

    if (conversation.user_id !== user.id) {
      return errorResponse(403, 'FORBIDDEN', 'Нет доступа к этому диалогу')
    }

    return HttpResponse.json({ items: mockStore.listMessages(conversation.id) })
  }),

  http.post(api('/conversations/:conversationId/messages'), async ({ request, params }) => {
    const user = requireUser(request)

    if (user instanceof Response) {
      return user
    }

    const conversation = mockStore.findConversation(String(params.conversationId))

    if (!conversation) {
      return errorResponse(404, 'NOT_FOUND', 'Диалог не найден')
    }

    if (conversation.user_id !== user.id) {
      return errorResponse(403, 'FORBIDDEN', 'Нет доступа к этому диалогу')
    }

    const body = SendMessageRequestSchema.safeParse(await request.json())

    if (!body.success) {
      return errorResponse(400, 'VALIDATION_ERROR', 'Проверьте текст сообщения')
    }

    const config = mockStore.getConfig()
    const scenario = detectScenario(body.data.text, config.scenario)

    if (scenario === 'rate_limit') {
      return HttpResponse.json(
        {
          error: {
            code: 'RATE_LIMITED',
            message: 'Превышен лимит запросов к AI',
            hint: 'Повторите позже',
            request_id: 'req_msw_rate_limit',
          },
        },
        { status: 429, headers: { 'Retry-After': '30' } },
      )
    }

    if (scenario === 'forbidden') {
      return errorResponse(403, 'FORBIDDEN', 'Этот запрос недоступен вашей роли')
    }

    if (!mockStore.findMessageByClientId(conversation.id, body.data.client_message_id)) {
      mockStore.addMessage({
        conversationId: conversation.id,
        userId: user.id,
        role: 'user',
        text: body.data.text,
        clientMessageId: body.data.client_message_id,
      })
    }

    const assistant = mockStore.addMessage({
      conversationId: conversation.id,
      userId: user.id,
      role: 'assistant',
      text: '',
      status: 'streaming',
    })

    const actionSpec = scenarioAction(scenario, body.data.text)
    const action = actionSpec
      ? mockStore.createAction(user.id, actionSpec.type, actionSpec.fields)
      : null

    const plan = buildScenario(scenario, {
      messageId: assistant.id,
      actionId: action?.id,
      teamId: user.team_id,
      sources: scenarioSources(scenario, user.team_id),
    })

    mockStore.finalizeMessage(assistant.id, {
      text: plan.assistantText,
      status: 'done',
      sources: plan.sources,
    })

    return sseResponse(plan.steps)
  }),

  http.get(api('/actions'), ({ request }) => {
    const user = requireUser(request)

    if (user instanceof Response) {
      return user
    }

    return HttpResponse.json({ items: mockStore.listActions(user.id) })
  }),

  http.get(api('/actions/:actionId'), ({ request, params }) => {
    const user = requireUser(request)

    if (user instanceof Response) {
      return user
    }

    const action = mockStore.findAction(String(params.actionId))

    if (!action) {
      return errorResponse(404, 'NOT_FOUND', 'Действие не найдено')
    }

    if (action.user_id !== user.id) {
      return errorResponse(403, 'FORBIDDEN', 'Нет доступа к этому действию')
    }

    const { user_id: _userId, ...publicAction } = action

    return HttpResponse.json(publicAction)
  }),

  http.post(api('/actions/:actionId/confirm'), ({ request, params }) => {
    const user = requireUser(request)

    if (user instanceof Response) {
      return user
    }

    const key = z.uuid().safeParse(request.headers.get('idempotency-key'))

    if (!key.success) {
      return errorResponse(400, 'VALIDATION_ERROR', 'Не указан Idempotency-Key')
    }

    const result = mockStore.confirmAction(user.id, String(params.actionId), key.data)

    if (result.ok) {
      return HttpResponse.json({ action: result.action })
    }

    if (result.reason === 'not_found') {
      return errorResponse(404, 'NOT_FOUND', 'Действие не найдено')
    }

    if (result.reason === 'forbidden') {
      return errorResponse(403, 'FORBIDDEN', 'Нет доступа к этому действию')
    }

    if (result.reason === 'conflict') {
      return HttpResponse.json(
        {
          error: {
            code: 'CONFLICT',
            message: 'Действие уже выполнено',
            hint: 'Показан сохранённый результат',
            request_id: 'req_msw_conflict',
          },
          action: result.action,
        },
        { status: 409 },
      )
    }

    return errorResponse(422, 'ACTION_NOT_ALLOWED', 'Это действие нельзя подтвердить')
  }),

  http.post(api('/actions/:actionId/cancel'), ({ request, params }) => {
    const user = requireUser(request)

    if (user instanceof Response) {
      return user
    }

    const result = mockStore.cancelAction(user.id, String(params.actionId))

    if (result.ok) {
      return HttpResponse.json({ action: result.action })
    }

    if (result.reason === 'not_found') {
      return errorResponse(404, 'NOT_FOUND', 'Действие не найдено')
    }

    if (result.reason === 'forbidden') {
      return errorResponse(403, 'FORBIDDEN', 'Нет доступа к этому действию')
    }

    if (result.reason === 'conflict') {
      return HttpResponse.json(
        {
          error: {
            code: 'CONFLICT',
            message: 'Действие уже выполнено',
            hint: 'Показан сохранённый результат',
            request_id: 'req_msw_conflict',
          },
          action: result.action,
        },
        { status: 409 },
      )
    }

    return errorResponse(422, 'ACTION_NOT_ALLOWED', 'Это действие нельзя отменить')
  }),

  http.get(api('/onboarding'), ({ request }) => {
    const user = requireUser(request)

    if (user instanceof Response) {
      return user
    }

    const onboarding = mockStore.getOnboarding(user.id)

    if (!onboarding) {
      return errorResponse(404, 'NOT_FOUND', 'Онбординг не найден')
    }

    return HttpResponse.json(onboarding)
  }),

  http.post(api('/messages/:messageId/feedback'), async ({ request, params }) => {
    const user = requireUser(request)

    if (user instanceof Response) {
      return user
    }

    const body = FeedbackRequestSchema.safeParse(await request.json())

    if (!body.success) {
      return errorResponse(400, 'VALIDATION_ERROR', 'Проверьте оценку')
    }

    const message = mockStore.findMessage(String(params.messageId))

    if (!message) {
      return errorResponse(404, 'NOT_FOUND', 'Сообщение не найдено')
    }

    const feedback = mockStore.addFeedback(user.id, message.id, body.data)

    if (!feedback) {
      return errorResponse(403, 'FORBIDDEN', 'Нет доступа к этому сообщению')
    }

    return HttpResponse.json({ feedback })
  }),

  http.post('*/__mock/reset', () => {
    mockStore.reset()
    return HttpResponse.json({ ok: true })
  }),

  http.post('*/__mock/config', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      scenario?: unknown
      latencyMs?: unknown
    }

    if (body.scenario !== undefined && body.scenario !== null) {
      if (typeof body.scenario !== 'string' || !isScenarioName(body.scenario)) {
        return errorResponse(400, 'VALIDATION_ERROR', 'Неизвестный сценарий')
      }
    }

    return HttpResponse.json({
      config: mockStore.setConfig({
        scenario: body.scenario === undefined ? undefined : (body.scenario as string | null),
        latencyMs: typeof body.latencyMs === 'number' ? body.latencyMs : undefined,
      }),
    })
  }),
]
