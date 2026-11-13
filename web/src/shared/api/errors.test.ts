import { describe, expect, it } from 'vitest'

import type { ClientErrorCode } from './errors'
import { ApiError, getErrorHint, getErrorMessage, getUserMessage } from './errors'

const EXPECTED_MESSAGES: Partial<Record<ClientErrorCode, string>> = {
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

describe('маппинг ошибок', () => {
  it('переводит коды в понятные сообщения', () => {
    for (const [code, message] of Object.entries(EXPECTED_MESSAGES)) {
      expect(getUserMessage(new ApiError({ code: code as ClientErrorCode, message }))).toBe(
        message,
      )
    }
  })

  it('возвращает hint и request_id через ApiError', () => {
    const error = new ApiError({
      code: 'RATE_LIMITED',
      message: 'Превышен лимит',
      hint: 'Повторите через минуту',
      requestId: 'req_42',
      retryAfter: 30,
      status: 429,
    })

    expect(getErrorHint(error)).toBe('Повторите через минуту')
    expect(getErrorMessage(error)).toBe('Превышен лимит')
    expect(error.requestId).toBe('req_42')
    expect(error.retryAfter).toBe(30)
    expect(error.status).toBe(429)
  })

  it('возвращает null hint для обычной ошибки', () => {
    expect(getErrorHint(new Error('boom'))).toBeNull()
  })

  it('обрабатывает неизвестную ошибку', () => {
    expect(getUserMessage('boom')).toBe('Что-то пошло не так. Попробуйте ещё раз.')
    expect(getErrorMessage('boom')).toBe('Что-то пошло не так. Попробуйте ещё раз.')
  })
})
