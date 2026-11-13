import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import App from '@/App'
import { useAuthStore } from '@/features/auth/auth-store'
import { AUTH_UNAUTHORIZED_EVENT } from '@/shared/api/client'
import { setAuthToken } from '@/shared/api/token'
import { renderWithProviders } from '@/test/utils'

describe('защита маршрутов', () => {
  it('перенаправляет неавторизованного пользователя на вход', async () => {
    renderWithProviders(<App />, { route: '/requests' })

    expect(await screen.findByText('Вход в AI-buddy')).toBeInTheDocument()
  })

  it('возвращает пользователя на исходный маршрут после входа', async () => {
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/onboarding' })

    await user.click(await screen.findByRole('button', { name: /Анна Стажёрова/ }))

    expect(await screen.findByRole('heading', { name: 'Онбординг' })).toBeInTheDocument()
  })

  it('открывает защищённый маршрут с сохранённой сессией', async () => {
    setAuthToken('mock.u_intern_a')
    renderWithProviders(<App />, { route: '/' })

    expect(await screen.findByRole('heading', { name: 'Чат с наставником' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Профиль: Анна Стажёрова/ })).toBeInTheDocument()
  })

  it('разлогинивает по событию 401', async () => {
    setAuthToken('mock.u_intern_a')
    renderWithProviders(<App />, { route: '/' })

    await screen.findByRole('heading', { name: 'Чат с наставником' })

    window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT))

    expect(await screen.findByText('Вход в AI-buddy')).toBeInTheDocument()
    expect(useAuthStore.getState().status).toBe('anonymous')
  })

  it('выходит из профиля через меню', async () => {
    setAuthToken('mock.u_intern_a')
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/' })

    await user.click(await screen.findByRole('button', { name: /Профиль: Анна Стажёрова/ }))
    await user.click(await screen.findByRole('menuitem', { name: 'Выйти' }))

    await waitFor(() => {
      expect(useAuthStore.getState().status).toBe('anonymous')
    })

    expect(await screen.findByText('Вход в AI-buddy')).toBeInTheDocument()
  })

  it('показывает 404 для неизвестного маршрута без авторизации', async () => {
    renderWithProviders(<App />, { route: '/unknown' })

    expect(await screen.findByRole('heading', { name: 'Страница не найдена' })).toBeInTheDocument()
  })
})
