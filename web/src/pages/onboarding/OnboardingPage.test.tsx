import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import App from '@/App'
import { setAuthToken } from '@/shared/api/token'
import { renderWithProviders } from '@/test/utils'

beforeEach(() => {
  setAuthToken('mock.u_intern_a')
})

describe('страница онбординга', () => {
  it('показывает полный чек-лист и прогресс', async () => {
    renderWithProviders(<App />, { route: '/onboarding' })

    expect(await screen.findByRole('heading', { name: 'Онбординг' })).toBeInTheDocument()
    expect(await screen.findByRole('progressbar', { name: 'Прогресс онбординга' })).toBeVisible()
    expect(screen.getByText('Следующий шаг')).toBeInTheDocument()
    expect(screen.getByText('День 1')).toBeInTheDocument()
    expect(screen.getByText('Первая неделя')).toBeInTheDocument()
    expect(screen.getByText('Первый месяц')).toBeInTheDocument()
  })

  it('«Начать» открывает чат с подставленным запросом', async () => {
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/onboarding' })

    await screen.findByRole('progressbar', { name: 'Прогресс онбординга' })

    await user.click(screen.getByRole('button', { name: 'Начать' }))

    expect(await screen.findByRole('heading', { name: 'Чат с наставником' })).toBeInTheDocument()
    expect(await screen.findByLabelText('Сообщение')).toHaveValue('Какие доступы мне нужны?')
  })
})
