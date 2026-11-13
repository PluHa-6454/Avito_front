import type { ActionType, Source, SseEvent } from '../shared/api/schemas'
import { KNOWLEDGE_DOCUMENTS } from './fixtures/documents'

export type ScenarioName =
  | 'kb'
  | 'absence'
  | 'access'
  | 'task'
  | 'refusal'
  | 'llm_error'
  | 'slow'
  | 'disconnect'
  | 'rate_limit'
  | 'forbidden'

export type ScenarioStep =
  | { delayMs: number; event: SseEvent }
  | { delayMs: number; disconnect: true }

export type ScenarioPlan = {
  name: ScenarioName
  steps: ScenarioStep[]
  sources: Source[]
  assistantText: string
}

export type ScenarioAction = {
  type: ActionType
  fields: Record<string, unknown>
}

const SCENARIO_NAMES: ScenarioName[] = [
  'kb',
  'absence',
  'access',
  'task',
  'refusal',
  'llm_error',
  'slow',
  'disconnect',
  'rate_limit',
  'forbidden',
]

const KEYWORDS: Array<{ scenario: ScenarioName; words: string[] }> = [
  { scenario: 'absence', words: ['отгул', 'отпуск', 'отдохнуть', 'выходной'] },
  { scenario: 'access', words: ['доступ', 'gitlab', 'вики', 'wiki', 'трекер'] },
  { scenario: 'task', words: ['задач', 'тикет', 'task'] },
  { scenario: 'refusal', words: ['наставник', 'не знаю', 'непонятно'] },
  { scenario: 'llm_error', words: ['ошибка', 'сбой', 'недоступ'] },
  { scenario: 'slow', words: ['медленно', 'подробно'] },
  { scenario: 'disconnect', words: ['обрыв', 'разрыв'] },
  { scenario: 'rate_limit', words: ['лимит', 'rate'] },
  { scenario: 'forbidden', words: ['нельзя', 'запрет', 'чуж'] },
  { scenario: 'kb', words: ['ревью', 'процесс', 'команда', 'онбординг'] },
]

const TEXTS: Record<ScenarioName, string> = {
  kb: 'Код-ревью проходит в два этапа. Сначала автор прикладывает описание изменений и чек-лист, затем ревьюер проверяет код в течение рабочего дня. Если правки большие, обсудите их с наставником. Все инструкции взяты из базы знаний вашей команды.',
  absence:
    'Подготовил черновик заявки на отгул. Проверьте дату и причину — после подтверждения заявка уйдёт руководителю.',
  access:
    'Подготовил запрос на доступ к GitLab. Проверьте обоснование и подтвердите заявку — согласующий увидит её в корпоративном сервисе.',
  task: 'Подготовил перевод задачи TASK-7 в работу. После подтверждения задача появится в вашем списке.',
  refusal:
    'В базе знаний команды нет достаточно точного ответа. Могу передать вопрос наставнику — подготовил обращение, его нужно подтвердить.',
  llm_error: '',
  slow: 'Собираю подробный ответ по вашей команде. Проверяю базу знаний, регламенты и историю задач. Это демонстрационный медленный поток, чтобы проверить, что интерфейс остаётся отзывчивым и навигация не блокируется.',
  disconnect: 'Начинаю отвечать, но соединение может прерваться.',
  rate_limit: '',
  forbidden: '',
}

export function isScenarioName(value: string): value is ScenarioName {
  return (SCENARIO_NAMES as string[]).includes(value)
}

export function detectScenario(text: string, override?: string | null): ScenarioName {
  if (override && isScenarioName(override)) {
    return override
  }

  const normalized = text.toLowerCase()

  for (const { scenario, words } of KEYWORDS) {
    if (words.some((word) => normalized.includes(word))) {
      return scenario
    }
  }

  return 'kb'
}

export function scenarioAction(name: ScenarioName, text: string): ScenarioAction | null {
  switch (name) {
    case 'absence':
      return {
        type: 'absence.create',
        fields: {
          date: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
          reason: text.trim() || 'Личные дела',
        },
      }
    case 'access':
      return {
        type: 'access.request',
        fields: {
          resource: 'GitLab',
          justification: text.trim() || 'Нужен доступ для работы над задачей',
        },
      }
    case 'task':
      return {
        type: 'tasks.transition',
        fields: {
          task_id: 'TASK-7',
          to_status: 'in_progress',
        },
      }
    case 'refusal':
      return {
        type: 'mentor.ask',
        fields: {
          question: text.trim() || 'Вопрос стажёра',
        },
      }
    default:
      return null
  }
}

export function scenarioSources(name: ScenarioName, teamId: string): Source[] {
  const teamDocuments = KNOWLEDGE_DOCUMENTS.filter((document) => document.team_id === teamId)
  const fallback = teamDocuments.length > 0 ? teamDocuments : KNOWLEDGE_DOCUMENTS
  const pick = (docId: string) =>
    KNOWLEDGE_DOCUMENTS.find((document) => document.doc_id === docId) ?? fallback[0]

  const toSource = (document: (typeof KNOWLEDGE_DOCUMENTS)[number]): Source => ({
    doc_id: document.doc_id,
    title: document.title,
    synthetic: document.synthetic,
  })

  switch (name) {
    case 'kb':
      return fallback.slice(0, 2).map(toSource)
    case 'absence':
      return [toSource(pick('kb-002'))]
    case 'access':
      return [toSource(pick('kb-003'))]
    case 'task':
      return [toSource(pick('kb-004'))]
    default:
      return []
  }
}

function status(stage: string, text: string): SseEvent {
  return { type: 'status', data: { stage, text } }
}

function token(text: string): SseEvent {
  return { type: 'token', data: { text } }
}

function tokens(text: string, size = 12, delayMs = 25): ScenarioStep[] {
  const steps: ScenarioStep[] = []

  for (let index = 0; index < text.length; index += size) {
    steps.push({ delayMs, event: token(text.slice(index, index + size)) })
  }

  return steps
}

type BuildScenarioOptions = {
  messageId: string
  actionId?: string
  teamId?: string
  sources?: Source[]
}

export function buildScenario(name: ScenarioName, options: BuildScenarioOptions): ScenarioPlan {
  const sources = options.sources ?? scenarioSources(name, options.teamId ?? 'team_a')
  const assistantText = TEXTS[name]
  const action = scenarioAction(name, assistantText)
  const actionId = options.actionId ?? 'act_preview'
  const doneEvent: ScenarioStep = {
    delayMs: 20,
    event: { type: 'done', data: { message_id: options.messageId } },
  }

  const sourceStep: ScenarioStep | null =
    sources.length > 0
      ? { delayMs: 20, event: { type: 'sources', data: { items: sources } } }
      : null

  switch (name) {
    case 'llm_error':
      return {
        name,
        sources,
        assistantText,
        steps: [
          { delayMs: 20, event: status('llm', 'готовлю ответ') },
          {
            delayMs: 60,
            event: {
              type: 'error',
              data: {
                code: 'LLM_UNAVAILABLE',
                message: 'AI временно недоступен. Попробуйте ещё раз.',
              },
            },
          },
        ],
      }
    case 'disconnect':
      return {
        name,
        sources,
        assistantText,
        steps: [
          { delayMs: 20, event: status('llm', 'готовлю ответ') },
          { delayMs: 40, event: token('Начинаю отвечать') },
          { delayMs: 40, disconnect: true },
        ],
      }
    case 'rate_limit':
    case 'forbidden':
      return { name, sources, assistantText, steps: [] }
    case 'slow':
      return {
        name,
        sources,
        assistantText,
        steps: [
          { delayMs: 20, event: status('kb_search', 'ищу в базе знаний') },
          ...tokens(assistantText, 6, 120),
          doneEvent,
        ],
      }
    default: {
      const steps: ScenarioStep[] = [
        { delayMs: 20, event: status('kb_search', 'ищу в базе знаний') },
      ]

      if (sourceStep) {
        steps.push(sourceStep)
      }

      steps.push(...tokens(assistantText))

      if (action) {
        steps.push({
          delayMs: 40,
          event: {
            type: 'action_draft',
            data: {
              action_id: actionId,
              type: action.type,
              fields: action.fields,
            },
          },
        })
      }

      steps.push(doneEvent)

      return { name, sources, assistantText, steps }
    }
  }
}
