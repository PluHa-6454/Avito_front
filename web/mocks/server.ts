import express, { type NextFunction, type Request, type Response } from 'express'
import { z } from 'zod'

import { mockStore } from '../src/mocks/core/store'
import {
  buildScenario,
  detectScenario,
  isScenarioName,
  scenarioAction,
  scenarioSources,
} from '../src/mocks/scenarios'
import {
  FeedbackRequestSchema,
  SendMessageRequestSchema,
  type ErrorCode,
  type SseEvent,
  type User,
} from '../src/shared/api/schemas'

const IdempotencyKeySchema = z.uuid()

function requestId(): string {
  return `req_${Math.random().toString(36).slice(2, 10)}`
}

function sendError(
  res: Response,
  status: number,
  code: ErrorCode,
  message: string,
  hint?: string,
) {
  res.status(status).json({
    error: {
      code,
      message,
      hint: hint ?? null,
      request_id: requestId(),
    },
  })
}

function requireUser(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''
  const user = mockStore.findUserByToken(token)

  if (!user) {
    sendError(res, 401, 'UNAUTHORIZED', 'Сессия истекла', 'Войдите снова')
    return
  }

  res.locals.user = user
  next()
}

function currentUser(res: Response): User {
  return res.locals.user as User
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function writeEvent(res: Response, event: SseEvent) {
  if (res.writableEnded || res.destroyed) {
    return
  }

  res.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`)
}

function sendConflict(res: Response, action: unknown) {
  res.status(409).json({
    error: {
      code: 'CONFLICT',
      message: 'Действие уже выполнено',
      hint: 'Показан сохранённый результат',
      request_id: requestId(),
    },
    action,
  })
}

export function createMockServer(): express.Express {
  const app = express()

  app.disable('x-powered-by')
  app.use(express.json({ limit: '1mb' }))

  app.get('/api/v1/healthz', (_req, res) => {
    res.type('text/plain').send('ok')
  })

  app.get('/api/v1/metrics', (_req, res) => {
    res.type('text/plain').send('# HELP ai_buddy_up Mock API availability\n# TYPE ai_buddy_up gauge\nai_buddy_up 1\n')
  })

  app.post('/api/v1/auth/login', (req, res) => {
    const body = z.object({ email: z.email() }).safeParse(req.body)

    if (!body.success) {
      sendError(res, 400, 'VALIDATION_ERROR', 'Укажите корректный email')
      return
    }

    const user = mockStore.findUserByEmail(body.data.email)

    if (!user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Тестовый пользователь не найден', 'Выберите пользователя из списка')
      return
    }

    res.json({ token: mockStore.issueToken(user), user })
  })

  app.get('/api/v1/me', requireUser, (_req, res) => {
    res.json(currentUser(res))
  })

  app.get('/api/v1/conversations', requireUser, (_req, res) => {
    res.json({ items: mockStore.listConversations(currentUser(res).id) })
  })

  app.post('/api/v1/conversations', requireUser, (req, res) => {
    const title = typeof req.body?.title === 'string' ? req.body.title : undefined
    const conversation = mockStore.createConversation(currentUser(res).id, title)
    res.status(201).json(conversation)
  })

  app.get('/api/v1/conversations/:conversationId', requireUser, (req, res) => {
    const conversation = mockStore.findConversation(String(req.params.conversationId))

    if (!conversation) {
      sendError(res, 404, 'NOT_FOUND', 'Диалог не найден')
      return
    }

    if (conversation.user_id !== currentUser(res).id) {
      sendError(res, 403, 'FORBIDDEN', 'Нет доступа к этому диалогу', 'Обратитесь к наставнику')
      return
    }

    const { user_id: _userId, ...publicConversation } = conversation
    res.json(publicConversation)
  })

  app.get('/api/v1/conversations/:conversationId/messages', requireUser, (req, res) => {
    const conversation = mockStore.findConversation(String(req.params.conversationId))

    if (!conversation) {
      sendError(res, 404, 'NOT_FOUND', 'Диалог не найден')
      return
    }

    if (conversation.user_id !== currentUser(res).id) {
      sendError(res, 403, 'FORBIDDEN', 'Нет доступа к этому диалогу', 'Обратитесь к наставнику')
      return
    }

    res.json({ items: mockStore.listMessages(conversation.id) })
  })

  app.post('/api/v1/conversations/:conversationId/messages', requireUser, async (req, res) => {
    const user = currentUser(res)
    const conversation = mockStore.findConversation(String(req.params.conversationId))

    if (!conversation) {
      sendError(res, 404, 'NOT_FOUND', 'Диалог не найден')
      return
    }

    if (conversation.user_id !== user.id) {
      sendError(res, 403, 'FORBIDDEN', 'Нет доступа к этому диалогу', 'Обратитесь к наставнику')
      return
    }

    const body = SendMessageRequestSchema.safeParse(req.body)

    if (!body.success) {
      sendError(res, 400, 'VALIDATION_ERROR', 'Проверьте текст сообщения', 'Сообщение не должно быть пустым')
      return
    }

    const config = mockStore.getConfig()
    const scenario = detectScenario(body.data.text, config.scenario)

    if (scenario === 'rate_limit') {
      res.setHeader('Retry-After', '30')
      sendError(res, 429, 'RATE_LIMITED', 'Превышен лимит запросов к AI', 'Повторите через 30 секунд')
      return
    }

    if (scenario === 'forbidden') {
      sendError(res, 403, 'FORBIDDEN', 'Этот запрос недоступен вашей роли', 'Обратитесь к наставнику')
      return
    }

    const existingUserMessage = mockStore.findMessageByClientId(
      conversation.id,
      body.data.client_message_id,
    )

    if (!existingUserMessage) {
      mockStore.addMessage({
        conversationId: conversation.id,
        userId: user.id,
        role: 'user',
        text: body.data.text,
        status: 'done',
        clientMessageId: body.data.client_message_id,
      })
    }

    const assistantMessage = mockStore.addMessage({
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
      messageId: assistantMessage.id,
      actionId: action?.id,
      teamId: user.team_id,
      sources: scenarioSources(scenario, user.team_id),
    })

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
    res.flushHeaders()

    let clientClosed = false
    let answerText = ''

    res.on('close', () => {
      if (!res.writableEnded) {
        clientClosed = true
      }
    })

    for (const step of plan.steps) {
      await sleep(step.delayMs + config.latencyMs)

      if (clientClosed || res.writableEnded || res.destroyed) {
        break
      }

      if ('disconnect' in step) {
        mockStore.finalizeMessage(assistantMessage.id, {
          text: answerText,
          status: 'error',
          sources: plan.sources,
        })
        res.destroy()
        return
      }

      writeEvent(res, step.event)

      if (step.event.type === 'token') {
        answerText += step.event.data.text
      }

      if (step.event.type === 'error') {
        mockStore.finalizeMessage(assistantMessage.id, {
          text: answerText,
          status: 'error',
          sources: plan.sources,
        })
        res.end()
        return
      }
    }

    mockStore.finalizeMessage(assistantMessage.id, {
      text: answerText || plan.assistantText,
      status: 'done',
      sources: plan.sources,
    })

    if (!res.writableEnded && !res.destroyed) {
      res.end()
    }
  })

  app.get('/api/v1/actions', requireUser, (_req, res) => {
    res.json({ items: mockStore.listActions(currentUser(res).id) })
  })

  app.get('/api/v1/actions/:actionId', requireUser, (req, res) => {
    const action = mockStore.findAction(String(req.params.actionId))

    if (!action) {
      sendError(res, 404, 'NOT_FOUND', 'Действие не найдено')
      return
    }

    if (action.user_id !== currentUser(res).id) {
      sendError(res, 403, 'FORBIDDEN', 'Нет доступа к этому действию', 'Обратитесь к наставнику')
      return
    }

    const { user_id: _userId, ...publicAction } = action
    res.json(publicAction)
  })

  app.post('/api/v1/actions/:actionId/confirm', requireUser, async (req, res) => {
    const key = req.header('idempotency-key') ?? ''
    const validKey = IdempotencyKeySchema.safeParse(key)

    if (!validKey.success) {
      sendError(
        res,
        400,
        'VALIDATION_ERROR',
        'Не указан Idempotency-Key',
        'Ключ должен быть UUID',
      )
      return
    }

    const config = mockStore.getConfig()

    if (config.latencyMs > 0) {
      await sleep(config.latencyMs)
    }

    const result = mockStore.confirmAction(currentUser(res).id, String(req.params.actionId), validKey.data)

    if (result.ok) {
      res.json({ action: result.action })
      return
    }

    if (result.reason === 'not_found') {
      sendError(res, 404, 'NOT_FOUND', 'Действие не найдено')
      return
    }

    if (result.reason === 'forbidden') {
      sendError(res, 403, 'FORBIDDEN', 'Нет доступа к этому действию', 'Обратитесь к наставнику')
      return
    }

    if (result.reason === 'conflict') {
      sendConflict(res, result.action)
      return
    }

    sendError(
      res,
      422,
      'ACTION_NOT_ALLOWED',
      'Это действие нельзя подтвердить',
      'Проверьте статус действия и права',
    )
  })

  app.post('/api/v1/actions/:actionId/cancel', requireUser, (req, res) => {
    const result = mockStore.cancelAction(currentUser(res).id, String(req.params.actionId))

    if (result.ok) {
      res.json({ action: result.action })
      return
    }

    if (result.reason === 'not_found') {
      sendError(res, 404, 'NOT_FOUND', 'Действие не найдено')
      return
    }

    if (result.reason === 'forbidden') {
      sendError(res, 403, 'FORBIDDEN', 'Нет доступа к этому действию', 'Обратитесь к наставнику')
      return
    }

    if (result.reason === 'conflict') {
      sendConflict(res, result.action)
      return
    }

    sendError(
      res,
      422,
      'ACTION_NOT_ALLOWED',
      'Это действие нельзя отменить',
      'Подтверждённое действие отменить нельзя',
    )
  })

  app.get('/api/v1/onboarding', requireUser, (_req, res) => {
    const onboarding = mockStore.getOnboarding(currentUser(res).id)

    if (!onboarding) {
      sendError(res, 404, 'NOT_FOUND', 'Онбординг не найден')
      return
    }

    res.json(onboarding)
  })

  app.post('/api/v1/messages/:messageId/feedback', requireUser, (req, res) => {
    const body = FeedbackRequestSchema.safeParse(req.body)

    if (!body.success) {
      sendError(res, 400, 'VALIDATION_ERROR', 'Проверьте оценку', 'Комментарий не длиннее 1000 символов')
      return
    }

    const message = mockStore.findMessage(String(req.params.messageId))

    if (!message) {
      sendError(res, 404, 'NOT_FOUND', 'Сообщение не найдено')
      return
    }

    const conversation = mockStore.findConversation(message.conversation_id)

    if (!conversation || conversation.user_id !== currentUser(res).id) {
      sendError(res, 403, 'FORBIDDEN', 'Нет доступа к этому сообщению', 'Обратитесь к наставнику')
      return
    }

    const feedback = mockStore.addFeedback(currentUser(res).id, message.id, body.data)

    if (!feedback) {
      sendError(res, 404, 'NOT_FOUND', 'Сообщение не найдено')
      return
    }

    res.json({ feedback })
  })

  const resetHandler = (_req: Request, res: Response) => {
    mockStore.reset()
    res.json({ ok: true })
  }

  app.post('/__mock/reset', resetHandler)
  app.post('/api/v1/__mock/reset', resetHandler)

  const configHandler = (req: Request, res: Response) => {
    const scenarioValue = req.body?.scenario

    if (scenarioValue !== undefined && scenarioValue !== null) {
      if (typeof scenarioValue !== 'string' || !isScenarioName(scenarioValue)) {
        sendError(res, 400, 'VALIDATION_ERROR', 'Неизвестный сценарий')
        return
      }
    }

    const latencyValue = req.body?.latencyMs

    if (latencyValue !== undefined && (typeof latencyValue !== 'number' || latencyValue < 0)) {
      sendError(res, 400, 'VALIDATION_ERROR', 'latencyMs должен быть неотрицательным числом')
      return
    }

    const config = mockStore.setConfig({
      scenario: scenarioValue === undefined ? undefined : scenarioValue,
      latencyMs: latencyValue,
    })

    res.json({ config })
  }

  app.post('/__mock/config', configHandler)
  app.post('/api/v1/__mock/config', configHandler)

  app.use((_req, res) => {
    sendError(res, 404, 'NOT_FOUND', 'Маршрут не найден')
  })

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[mock] unhandled error', error)
    sendError(res, 500, 'INTERNAL', 'Внутренняя ошибка mock-сервера')
  })

  return app
}
