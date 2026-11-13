import type { ErrorCode } from './schemas'

export type ClientErrorCode =
  | ErrorCode
  | 'NETWORK'
  | 'TIMEOUT'
  | 'ABORTED'
  | 'INVALID_RESPONSE'

export type ApiErrorInit = {
  code: ClientErrorCode
  message: string
  status?: number | null
  hint?: string | null
  requestId?: string | null
  retryAfter?: number | null
  details?: unknown
}

export class ApiError extends Error {
  readonly code: ClientErrorCode
  readonly status: number | null
  readonly hint: string | null
  readonly requestId: string | null
  readonly retryAfter: number | null
  readonly details: unknown

  constructor({ code, message, status = null, hint = null, requestId = null, retryAfter = null, details }: ApiErrorInit) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.hint = hint
    this.requestId = requestId
    this.retryAfter = retryAfter
    this.details = details
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

const USER_MESSAGES: Record<ClientErrorCode, string> = {
  VALIDATION_ERROR: 'Проверьте данные и попробуйте снова.',
  UNAUTHORIZED: 'Сессия истекла. Войдите снова.',
  FORBIDDEN: 'У вас нет доступа к этому действию.',
  NOT_FOUND: 'Не удалось найти запрошенные данные.',
  CONFLICT: 'Действие уже выполнено.',
  ACTION_NOT_ALLOWED: 'Это действие сейчас недоступно.',
  RATE_LIMITED: 'Слишком много запросов. Попробуйте позже.',
  INTERNAL: 'Что-то пошло не так. Попробуйте ещё раз.',
  LLM_UNAVAILABLE: 'AI временно недоступен. Попробуйте ещё раз.',
  NETWORK: 'Нет соединения с сервером.',
  TIMEOUT: 'Сервер не ответил вовремя.',
  ABORTED: 'Запрос отменён.',
  INVALID_RESPONSE: 'Сервер вернул неожиданный ответ.',
}

export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.message || USER_MESSAGES[error.code]
  }

  return 'Что-то пошло не так. Попробуйте ещё раз.'
}

export function getUserMessage(error: unknown): string {
  if (isApiError(error)) {
    return USER_MESSAGES[error.code]
  }

  return USER_MESSAGES.INTERNAL
}

export function getErrorHint(error: unknown): string | null {
  return isApiError(error) ? error.hint : null
}
