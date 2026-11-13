import { z } from 'zod'

import { env } from '@/shared/lib/env'

import { ApiError, isApiError } from './errors'
import { ErrorResponseSchema } from './schemas'
import { getAuthToken } from './token'

const DEFAULT_TIMEOUT_MS = 15_000

export const AUTH_UNAUTHORIZED_EVENT = 'auth:unauthorized'

function buildUrl(path: string): string {
  const base = env.apiBaseUrl.endsWith('/') ? env.apiBaseUrl.slice(0, -1) : env.apiBaseUrl
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin

  return new URL(`${base}${normalizedPath}`, origin).toString()
}

function buildHeaders(body: unknown, headers?: HeadersInit): Headers {
  const result = new Headers(headers)
  const token = getAuthToken()

  if (token) {
    result.set('Authorization', `Bearer ${token}`)
  }

  if (body !== undefined) {
    result.set('Content-Type', 'application/json')
  }

  if (!result.has('Accept')) {
    result.set('Accept', 'application/json')
  }

  return result
}

function notifyUnauthorized() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT))
  }
}

export async function parseErrorResponse(
  response: Response,
  options: { notifyAuth?: boolean } = {},
): Promise<ApiError> {
  const { notifyAuth = true } = options
  const raw = await response.text().catch(() => '')
  let parsed: unknown = null

  if (raw) {
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = null
    }
  }

  const errorBody = ErrorResponseSchema.safeParse(parsed)
  const retryAfterHeader = response.headers.get('Retry-After')
  const retryAfter = retryAfterHeader ? Number(retryAfterHeader) : null

  if (response.status === 401 && notifyAuth) {
    notifyUnauthorized()
  }

  if (errorBody.success) {
    return new ApiError({
      code: errorBody.data.error.code,
      message: errorBody.data.error.message,
      hint: errorBody.data.error.hint ?? null,
      requestId: errorBody.data.error.request_id,
      status: response.status,
      retryAfter: Number.isFinite(retryAfter) ? retryAfter : null,
      details: parsed,
    })
  }

  return new ApiError({
    code: response.status >= 500 ? 'INTERNAL' : 'INVALID_RESPONSE',
    message: `Сервер вернул ошибку ${response.status}`,
    status: response.status,
    retryAfter: Number.isFinite(retryAfter) ? retryAfter : null,
    details: parsed,
  })
}

type ApiFetchOptions<T> = {
  path: string
  method?: string
  body?: unknown
  schema?: z.ZodType<T>
  signal?: AbortSignal
  headers?: HeadersInit
  timeoutMs?: number
}

export async function apiFetch<T>({
  path,
  method = 'GET',
  body,
  schema,
  signal,
  headers,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: ApiFetchOptions<T>): Promise<T> {
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  const abortFromCaller = () => controller.abort()
  signal?.addEventListener('abort', abortFromCaller, { once: true })

  try {
    const response = await fetch(buildUrl(path), {
      method,
      headers: buildHeaders(body, headers),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw await parseErrorResponse(response, { notifyAuth: path !== '/auth/login' })
    }

    if (response.status === 204) {
      return undefined as T
    }

    const raw = await response.text()
    let parsed: unknown = null

    if (raw) {
      try {
        parsed = JSON.parse(raw)
      } catch {
        throw new ApiError({
          code: 'INVALID_RESPONSE',
          message: 'Сервер вернул ответ в неожиданном формате',
          status: response.status,
        })
      }
    }

    if (!schema) {
      return parsed as T
    }

    const validation = schema.safeParse(parsed)

    if (!validation.success) {
      throw new ApiError({
        code: 'INVALID_RESPONSE',
        message: 'Сервер вернул данные в неожиданном формате',
        status: response.status,
        details: validation.error.issues,
      })
    }

    return validation.data
  } catch (error) {
    if (isApiError(error)) {
      throw error
    }

    if (
      error instanceof DOMException && error.name === 'AbortError'
    ) {
      throw new ApiError({
        code: timedOut ? 'TIMEOUT' : 'ABORTED',
        message: timedOut ? 'Сервер не ответил вовремя' : 'Запрос отменён',
      })
    }

    if (typeof error === 'object' && error !== null && 'name' in error) {
      const name = (error as { name?: unknown }).name

      if (name === 'AbortError') {
        throw new ApiError({
          code: timedOut ? 'TIMEOUT' : 'ABORTED',
          message: timedOut ? 'Сервер не ответил вовремя' : 'Запрос отменён',
        })
      }
    }

    throw new ApiError({
      code: 'NETWORK',
      message: 'Не удалось связаться с сервером',
      details: error,
    })
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', abortFromCaller)
  }
}

type ApiStreamOptions = {
  path: string
  method?: string
  body?: unknown
  signal?: AbortSignal
  headers?: HeadersInit
}

export async function apiStream({
  path,
  method = 'POST',
  body,
  signal,
  headers,
}: ApiStreamOptions): Promise<Response> {
  const requestHeaders = buildHeaders(body, headers)
  requestHeaders.set('Accept', 'text/event-stream')

  const response = await fetch(buildUrl(path), {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    throw await parseErrorResponse(response, { notifyAuth: path !== '/auth/login' })
  }

  return response
}

export async function apiFetchText(path: string, signal?: AbortSignal): Promise<string> {
  const response = await fetch(buildUrl(path), {
    headers: buildHeaders(undefined, { Accept: 'text/plain' }),
    signal,
  })

  if (!response.ok) {
    throw await parseErrorResponse(response)
  }

  return response.text()
}
