import { describe, expect, it } from 'vitest'

import App from '@/App'
import { setAuthToken } from '@/shared/api/token'
import { renderWithProviders } from '@/test/utils'

describe('маршрутизация', () => {
  it('открывает страницу входа', async () => {
    const { findByText } = renderWithProviders(<App />, { route: '/login' })

    expect(await findByText('Вход в AI-buddy')).toBeInTheDocument()
  })

  it('открывает чат на главной для авторизованного пользователя', async () => {
    setAuthToken('mock.u_intern_a')
    const { findByRole } = renderWithProviders(<App />, { route: '/' })

    expect(await findByRole('heading', { name: 'Чат с наставником' })).toBeInTheDocument()
  })

  it('открывает заявки', async () => {
    setAuthToken('mock.u_intern_a')
    const { findByRole } = renderWithProviders(<App />, { route: '/requests' })

    expect(await findByRole('heading', { name: 'Мои заявки' })).toBeInTheDocument()
  })

  it('открывает онбординг', async () => {
    setAuthToken('mock.u_intern_a')
    const { findByRole } = renderWithProviders(<App />, { route: '/onboarding' })

    expect(await findByRole('heading', { name: 'Онбординг' })).toBeInTheDocument()
  })

  it('показывает 404 для неизвестного маршрута', async () => {
    const { findByRole } = renderWithProviders(<App />, { route: '/unknown' })

    expect(await findByRole('heading', { name: 'Страница не найдена' })).toBeInTheDocument()
  })

  it('не регистрирует /mentor, пока флаг выключен', async () => {
    const { findByRole } = renderWithProviders(<App />, { route: '/mentor' })

    expect(await findByRole('heading', { name: 'Страница не найдена' })).toBeInTheDocument()
  })
})
