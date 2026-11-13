import { describe, expect, it } from 'vitest'

import { useAuthStore } from './auth-store'
import { setAuthToken } from '@/shared/api/token'

describe('auth store', () => {
  it('логинит пользователя и сохраняет токен', async () => {
    await useAuthStore.getState().login('intern@test.local')

    const state = useAuthStore.getState()

    expect(state.status).toBe('authenticated')
    expect(state.user?.name).toBe('Анна Стажёрова')
    expect(state.token).toBe('mock.u_intern_a')
    expect(window.sessionStorage.getItem('ai-buddy.token')).toBe('mock.u_intern_a')
  })

  it('возвращает ошибку при неизвестном пользователе', async () => {
    await expect(useAuthStore.getState().login('nobody@test.local')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    })

    const state = useAuthStore.getState()

    expect(state.status).toBe('anonymous')
    expect(state.user).toBeNull()
    expect(state.error).toMatchObject({ code: 'UNAUTHORIZED' })
  })

  it('восстанавливает сессию по сохранённому токену', async () => {
    setAuthToken('mock.u_intern_a')

    await useAuthStore.getState().hydrate()

    expect(useAuthStore.getState()).toMatchObject({
      status: 'authenticated',
      user: { id: 'u_intern_a' },
    })
  })

  it('сбрасывает сессию при недействительном токене', async () => {
    setAuthToken('mock.u_unknown')

    await useAuthStore.getState().hydrate()

    expect(useAuthStore.getState().status).toBe('anonymous')
    expect(window.sessionStorage.getItem('ai-buddy.token')).toBeNull()
  })

  it('становится анонимным без токена', async () => {
    await useAuthStore.getState().hydrate()

    expect(useAuthStore.getState().status).toBe('anonymous')
  })

  it('очищает сессию при выходе', async () => {
    await useAuthStore.getState().login('mentor@test.local')

    useAuthStore.getState().logout()

    const state = useAuthStore.getState()

    expect(state.status).toBe('anonymous')
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(window.sessionStorage.getItem('ai-buddy.token')).toBeNull()
  })
})
