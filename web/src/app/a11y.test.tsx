import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import App from '@/App'
import { setAuthToken } from '@/shared/api/token'
import { renderWithProviders } from '@/test/utils'

beforeEach(() => {
  setAuthToken('mock.u_intern_a')
})

describe('доступность каркаса', () => {
  it('даёт лендмарки, заголовки и подписи элементов', async () => {
    renderWithProviders(<App />, { route: '/' })

    expect(await screen.findByRole('heading', { level: 1, name: 'Чат с наставником' })).toBeVisible()

    const skipLink = screen.getByRole('link', { name: 'Перейти к содержимому' })
    expect(skipLink).toHaveAttribute('href', '#main-content')

    expect(screen.getByRole('navigation', { name: 'Основная навигация' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content')
    expect(screen.getByRole('log', { name: 'Сообщения диалога' })).toBeInTheDocument()

    expect(screen.getByRole('textbox', { name: 'Сообщение' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Отправить сообщение' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Профиль: Анна Стажёрова/ })).toBeInTheDocument()
  })

  it('помечает прогресс онбординга ARIA-атрибутами', async () => {
    renderWithProviders(<App />, { route: '/' })

    const progress = await screen.findByRole('progressbar', { name: 'Прогресс онбординга' })

    expect(progress).toHaveAttribute('aria-valuemin', '0')
    expect(progress).toHaveAttribute('aria-valuemax', '100')
    expect(Number(progress.getAttribute('aria-valuenow'))).toBeGreaterThanOrEqual(0)
  })

  it('делает источники доступными с клавиатуры', async () => {
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/' })

    await screen.findByRole('log', { name: 'Сообщения диалога' })

    await user.type(screen.getByRole('textbox', { name: 'Сообщение' }), 'Как устроено код-ревью?')
    await user.click(screen.getByRole('button', { name: 'Отправить сообщение' }))

    const sources = await screen.findAllByRole('listitem', { name: /Источник:/ })

    expect(sources.length).toBeGreaterThan(0)
    expect(sources[0]).toHaveAttribute('tabindex', '0')
  })
})
