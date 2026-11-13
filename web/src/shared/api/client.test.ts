import { HttpResponse, delay, http } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { mockStore } from '@/mocks/core/store'
import { createId } from '@/shared/lib/id'
import { server } from '@/test/server'

import { AUTH_UNAUTHORIZED_EVENT, apiFetch } from './client'
import { confirmAction, getMe, login } from './endpoints'
import { ApiError } from './errors'
import { UserSchema } from './schemas'
import { clearAuthToken, setAuthToken } from './token'

describe('API-клиент', () => {
  beforeEach(() => {
    clearAuthToken()
  })

  it('логинится тестовым пользователем', async () => {
    const result = await login('intern@test.local')

    expect(result.user.name).toBe('Анна Стажёрова')
    expect(result.token).toBe('mock.u_intern_a')
  })

  it('возвращает профиль с Bearer-токеном', async () => {
    setAuthToken('mock.u_intern_a')

    const user = await getMe()

    expect(user.team_name).toBe('Команда A')
    expect(user.role).toBe('intern')
  })

  it('маппит 401 в ApiError и отправляет событие', async () => {
    const listener = vi.fn()
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, listener)

    await expect(getMe()).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      status: 401,
    })

    expect(listener).toHaveBeenCalledTimes(1)
    window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, listener)
  })

  it('возвращает сохранённый результат при 409', async () => {
    setAuthToken('mock.u_intern_a')
    const action = mockStore.createAction('u_intern_a', 'absence.create', {
      date: '2026-11-20',
    })

    const first = await confirmAction(action.id, createId())
    expect(first.action.status).toBe('done')

    const error = await confirmAction(action.id, createId()).catch((cause: unknown) => cause)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ code: 'CONFLICT', status: 409 })
    expect((error as ApiError).details).toMatchObject({
      action: { id: action.id, status: 'done' },
    })
  })

  it('сообщает о неверном формате ответа', async () => {
    setAuthToken('mock.u_intern_a')
    server.use(
      http.get('*/api/v1/me', () => HttpResponse.json({ unexpected: true })),
    )

    await expect(apiFetch({ path: '/me', schema: UserSchema })).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    })
  })

  it('сообщает о таймауте', async () => {
    setAuthToken('mock.u_intern_a')
    server.use(
      http.get('*/api/v1/me', async () => {
        await delay(100)
        return HttpResponse.json({})
      }),
    )

    await expect(apiFetch({ path: '/me', timeoutMs: 10 })).rejects.toMatchObject({
      code: 'TIMEOUT',
    })
  })
})
