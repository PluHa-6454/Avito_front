import type {
  Action,
  ActionType,
  Conversation,
  Feedback,
  FeedbackRequest,
  Message,
  MessageRole,
  Onboarding,
  User,
} from '../../shared/api/schemas'
import { createOnboardingTemplate, withProgress } from '../fixtures/onboarding'
import { TEST_USERS } from '../fixtures/users'

export type StoredConversation = Conversation & {
  user_id: string
}

export type StoredMessage = Message & {
  user_id: string
  client_message_id?: string | null
}

export type StoredAction = Action & {
  user_id: string
}

export type MockConfig = {
  scenario: string | null
  latencyMs: number
}

export type ConfirmResult =
  | { ok: true; action: Action }
  | { ok: false; reason: 'not_found' | 'forbidden' | 'conflict' | 'not_allowed'; action?: Action }

export type CancelResult =
  | { ok: true; action: Action }
  | { ok: false; reason: 'not_found' | 'forbidden' | 'conflict' | 'not_allowed'; action?: Action }

function nowIso(): string {
  return new Date().toISOString()
}

function toPublicAction({ user_id: _userId, ...action }: StoredAction): Action {
  return action
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

export class MockStore {
  private users: User[] = []
  private conversations: StoredConversation[] = []
  private messages: StoredMessage[] = []
  private actions: StoredAction[] = []
  private onboardings = new Map<string, Onboarding>()
  private feedbackByMessage = new Map<string, Feedback>()
  private idempotency = new Map<string, Action>()
  private config: MockConfig = { scenario: null, latencyMs: 0 }
  private sequence = 100

  constructor() {
    this.reset()
  }

  reset(): void {
    this.users = clone(TEST_USERS)
    this.conversations = []
    this.messages = []
    this.actions = []
    this.onboardings = new Map()
    this.feedbackByMessage = new Map()
    this.idempotency = new Map()
    this.config = { scenario: null, latencyMs: 0 }
    this.sequence = 100

    for (const user of this.users) {
      this.onboardings.set(user.id, createOnboardingTemplate(user))
    }

    this.seedConversations()
    this.seedActions()
  }

  getConfig(): MockConfig {
    return { ...this.config }
  }

  setConfig(config: Partial<MockConfig>): MockConfig {
    this.config = {
      scenario: config.scenario === undefined ? this.config.scenario : config.scenario,
      latencyMs: config.latencyMs ?? this.config.latencyMs,
    }

    return this.getConfig()
  }

  findUserByEmail(email: string): User | undefined {
    return this.users.find((user) => user.email.toLowerCase() === email.toLowerCase())
  }

  findUserById(userId: string): User | undefined {
    return this.users.find((user) => user.id === userId)
  }

  issueToken(user: User): string {
    return `mock.${user.id}`
  }

  findUserByToken(token: string): User | undefined {
    if (!token.startsWith('mock.')) {
      return undefined
    }

    return this.findUserById(token.slice('mock.'.length))
  }

  findConversation(conversationId: string): StoredConversation | undefined {
    return this.conversations.find((conversation) => conversation.id === conversationId)
  }

  listConversations(userId: string): Conversation[] {
    return this.conversations
      .filter((conversation) => conversation.user_id === userId)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .map(({ user_id: _userId, ...conversation }) => conversation)
  }

  createConversation(userId: string, title?: string): Conversation {
    const timestamp = nowIso()
    const conversation: StoredConversation = {
      id: this.nextId('conv'),
      user_id: userId,
      title: title?.trim() || 'Новый диалог',
      created_at: timestamp,
      updated_at: timestamp,
    }

    this.conversations.push(conversation)

    return this.toPublicConversation(conversation)
  }

  listMessages(conversationId: string): Message[] {
    return this.messages
      .filter((message) => message.conversation_id === conversationId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((message) => this.toPublicMessage(message))
  }

  findMessage(messageId: string): StoredMessage | undefined {
    return this.messages.find((message) => message.id === messageId)
  }

  findMessageByClientId(conversationId: string, clientMessageId: string): StoredMessage | undefined {
    return this.messages.find(
      (message) =>
        message.conversation_id === conversationId &&
        message.client_message_id === clientMessageId,
    )
  }

  addMessage(input: {
    conversationId: string
    userId: string
    role: MessageRole
    text: string
    status?: Message['status']
    sources?: Message['sources']
    clientMessageId?: string | null
  }): Message {
    const timestamp = nowIso()
    const message: StoredMessage = {
      id: this.nextId('msg'),
      conversation_id: input.conversationId,
      user_id: input.userId,
      role: input.role,
      text: input.text,
      status: input.status ?? 'done',
      sources: input.sources ?? [],
      created_at: timestamp,
      feedback: null,
      client_message_id: input.clientMessageId ?? null,
    }

    this.messages.push(message)
    this.touchConversation(input.conversationId, timestamp)

    return this.toPublicMessage(message)
  }

  finalizeMessage(
    messageId: string,
    update: { text: string; status: Message['status']; sources?: Message['sources'] },
  ): Message | undefined {
    const message = this.findMessage(messageId)

    if (!message) {
      return undefined
    }

    message.text = update.text
    message.status = update.status
    message.sources = update.sources ?? message.sources
    this.touchConversation(message.conversation_id, nowIso())

    return this.toPublicMessage(message)
  }

  listActions(userId: string): Action[] {
    return this.actions
      .filter((action) => action.user_id === userId)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .map(toPublicAction)
  }

  findAction(actionId: string): StoredAction | undefined {
    return this.actions.find((action) => action.id === actionId)
  }

  createAction(userId: string, type: ActionType, fields: Record<string, unknown>): Action {
    const timestamp = nowIso()
    const action: StoredAction = {
      id: this.nextId('act'),
      user_id: userId,
      type,
      status: 'draft',
      fields,
      result: null,
      error: null,
      created_at: timestamp,
      updated_at: timestamp,
      history: [{ status: 'draft', at: timestamp, note: 'Черновик создан агентом' }],
    }

    this.actions.push(action)

    return toPublicAction(action)
  }

  confirmAction(userId: string, actionId: string, idempotencyKey: string): ConfirmResult {
    const action = this.findAction(actionId)

    if (!action) {
      return { ok: false, reason: 'not_found' }
    }

    if (action.user_id !== userId) {
      return { ok: false, reason: 'forbidden' }
    }

    const storedKey = `${actionId}:${idempotencyKey}`
    const previous = this.idempotency.get(storedKey)

    if (previous) {
      return { ok: true, action: previous }
    }

    if (action.status === 'done' || action.status === 'failed') {
      return { ok: false, reason: 'conflict', action: toPublicAction(action) }
    }

    if (action.status === 'cancelled') {
      return { ok: false, reason: 'not_allowed', action: toPublicAction(action) }
    }

    if (action.status !== 'draft') {
      return { ok: false, reason: 'conflict', action: toPublicAction(action) }
    }

    const timestamp = nowIso()
    action.status = 'executing'
    action.updated_at = timestamp
    action.history.push({ status: 'executing', at: timestamp, note: 'Подтверждено пользователем' })

    const result = this.buildActionResult(action)
    const finishedAt = nowIso()
    action.status = 'done'
    action.result = result
    action.updated_at = finishedAt
    action.history.push({
      status: 'done',
      at: finishedAt,
      note: 'Корпоративный сервис вернул результат',
    })

    this.closeOnboardingStep(userId, action.type, action.fields)

    const publicAction = toPublicAction(action)
    this.idempotency.set(storedKey, publicAction)

    return { ok: true, action: publicAction }
  }

  cancelAction(userId: string, actionId: string): CancelResult {
    const action = this.findAction(actionId)

    if (!action) {
      return { ok: false, reason: 'not_found' }
    }

    if (action.user_id !== userId) {
      return { ok: false, reason: 'forbidden' }
    }

    if (action.status === 'cancelled') {
      return { ok: true, action: toPublicAction(action) }
    }

    if (action.status === 'done' || action.status === 'failed') {
      return { ok: false, reason: 'conflict', action: toPublicAction(action) }
    }

    if (action.status !== 'draft') {
      return { ok: false, reason: 'not_allowed', action: toPublicAction(action) }
    }

    const timestamp = nowIso()
    action.status = 'cancelled'
    action.updated_at = timestamp
    action.history.push({ status: 'cancelled', at: timestamp, note: 'Черновик отменён' })

    return { ok: true, action: toPublicAction(action) }
  }

  getOnboarding(userId: string): Onboarding | undefined {
    return this.onboardings.get(userId)
  }

  addFeedback(userId: string, messageId: string, body: FeedbackRequest): Feedback | null {
    const message = this.findMessage(messageId)

    if (!message || message.user_id !== userId) {
      return null
    }

    const existing = this.feedbackByMessage.get(messageId)
    const feedback: Feedback = {
      id: existing?.id ?? this.nextId('fb'),
      message_id: messageId,
      rating: body.rating,
      comment: body.comment ?? null,
      created_at: nowIso(),
    }

    this.feedbackByMessage.set(messageId, feedback)
    message.feedback = feedback

    return feedback
  }

  private seedConversations(): void {
    const timestamp = nowIso()
    const conversation: StoredConversation = {
      id: 'conv_seed_1',
      user_id: 'u_intern_a',
      title: 'Первый день',
      created_at: timestamp,
      updated_at: timestamp,
    }

    this.conversations.push(conversation)
    this.messages.push({
      id: 'msg_seed_1',
      conversation_id: conversation.id,
      user_id: 'u_intern_a',
      role: 'assistant',
      text: 'Привет! Я AI-buddy — помощник по адаптации. Спросите про команду, доступы, задачи или отгул.',
      status: 'done',
      sources: [],
      created_at: timestamp,
      feedback: null,
      client_message_id: null,
    })
  }

  private seedActions(): void {
    const timestamp = nowIso()

    this.actions.push({
      id: 'act_seed_1',
      user_id: 'u_intern_a',
      type: 'absence.create',
      status: 'done',
      fields: { date: '2026-11-10', reason: 'Личные дела' },
      result: { number: 'ABS-1001', status: 'approved', approver: 'Илья Соколов' },
      error: null,
      created_at: timestamp,
      updated_at: timestamp,
      history: [
        { status: 'draft', at: timestamp, note: 'Черновик создан агентом' },
        { status: 'done', at: timestamp, note: 'Согласовано руководителем' },
      ],
    })

    this.actions.push({
      id: 'act_seed_2',
      user_id: 'u_intern_a',
      type: 'access.request',
      status: 'cancelled',
      fields: { resource: 'Admin panel', justification: 'Не требуется' },
      result: null,
      error: null,
      created_at: timestamp,
      updated_at: timestamp,
      history: [
        { status: 'draft', at: timestamp, note: 'Черновик создан агентом' },
        { status: 'cancelled', at: timestamp, note: 'Черновик отменён' },
      ],
    })
  }

  private closeOnboardingStep(
    userId: string,
    type: ActionType,
    fields: Record<string, unknown>,
  ): void {
    const onboarding = this.onboardings.get(userId)

    if (!onboarding) {
      return
    }

    if (type === 'tasks.transition' && fields.to_status !== 'in_progress') {
      return
    }

    for (const stage of onboarding.stages) {
      const step = stage.steps.find((item) => item.status !== 'done' && item.action_type === type)

      if (step) {
        step.status = 'done'
        break
      }
    }

    this.onboardings.set(userId, withProgress(onboarding.stages))
  }

  private buildActionResult(action: StoredAction): Record<string, unknown> {
    switch (action.type) {
      case 'absence.create':
        return {
          number: 'ABS-1024',
          status: 'pending',
          approver: 'Мария Петрова',
        }
      case 'access.request':
        return {
          number: 'ACC-2048',
          status: 'pending',
          approver: 'Илья Соколов',
        }
      case 'tasks.transition':
        return {
          task_id: action.fields.task_id ?? 'TASK-7',
          status: action.fields.to_status ?? 'in_progress',
        }
      case 'mentor.ask':
        return {
          request_id: this.nextId('mentor'),
          status: 'sent',
          mentor: 'Мария Петрова',
        }
      default:
        return {}
    }
  }

  private touchConversation(conversationId: string, timestamp: string): void {
    const conversation = this.findConversation(conversationId)

    if (conversation) {
      conversation.updated_at = timestamp
    }
  }

  private toPublicConversation({
    user_id: _userId,
    ...conversation
  }: StoredConversation): Conversation {
    return conversation
  }

  private toPublicMessage({ user_id: _userId, ...message }: StoredMessage): Message {
    return message
  }

  private nextId(prefix: string): string {
    this.sequence += 1
    return `${prefix}_${this.sequence}`
  }
}

export const mockStore = new MockStore()
