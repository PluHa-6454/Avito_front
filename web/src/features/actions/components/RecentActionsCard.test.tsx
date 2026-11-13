import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { setAuthToken } from '@/shared/api/token'
import { renderWithProviders } from '@/test/utils'

import { RecentActionsCard } from './RecentActionsCard'

beforeEach(() => {
  setAuthToken('mock.u_intern_a')
})

describe('блок «Мои заявки»', () => {
  it('показывает последние действия со статусами', async () => {
    renderWithProviders(<RecentActionsCard />)

    expect(await screen.findByText('Заявка на отгул')).toBeInTheDocument()
    expect(screen.getByText('Запрос доступа')).toBeInTheDocument()
    expect(screen.getByText('Готово')).toBeInTheDocument()
    expect(screen.getByText('Отменено')).toBeInTheDocument()
    expect(screen.getByText(/ABS-1001/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Все/ })).toHaveAttribute('href', '/requests')
  })
})
