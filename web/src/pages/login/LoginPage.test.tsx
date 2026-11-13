import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'

import { useAuthStore } from '@/features/auth/auth-store'
import { TEST_USER_OPTIONS } from '@/features/auth/test-users'
import { server } from '@/test/server'
import { renderWithProviders } from '@/test/utils'

import { LoginPage } from './LoginPage'

describe('страница входа', () => {
  it('показывает всех тестовых пользователей', () => {
    renderWithProviders(<LoginPage />, { route: '/login' })

    for (const user of TEST_USER_OPTIONS) {
      expect(screen.getByText(user.name)).toBeInTheDocument()
      expect(screen.getByText(user.description)).toBeInTheDocument()
    }
  })

  it('после выбора пользователя сохраняет сессию', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />, { route: '/login' })

    await user.click(screen.getByRole('button', { name: /Анна Стажёрова/ }))

    expect(useAuthStore.getState()).toMatchObject({
      status: 'authenticated',
      user: { email: 'intern@test.local' },
    })
  })

  it('показывает ошибку входа и остаётся на странице', async () => {
    server.use(
      http.post('*/api/v1/auth/login', () =>
        HttpResponse.json(
          {
            error: {
              code: 'UNAUTHORIZED',
              message: 'Тестовый пользователь не найден',
              hint: 'Выберите пользователя из списка',
              request_id: 'req_test',
            },
          },
          { status: 401 },
        ),
      ),
    )

    const user = userEvent.setup()
    renderWithProviders(<LoginPage />, { route: '/login' })

    await user.click(screen.getByRole('button', { name: /Анна Стажёрова/ }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Сессия истекла. Войдите снова.')).toBeInTheDocument()
    expect(screen.getByText('Выберите пользователя из списка')).toBeInTheDocument()
    expect(useAuthStore.getState().status).toBe('anonymous')
  })
})
