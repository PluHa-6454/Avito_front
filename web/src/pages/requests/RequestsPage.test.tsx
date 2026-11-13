import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'

import { setAuthToken } from '@/shared/api/token'
import { renderWithProviders } from '@/test/utils'
import { server } from '@/test/server'

import { RequestsPage } from './RequestsPage'

beforeEach(() => {
  setAuthToken('mock.u_intern_a')
})

describe('страница заявок', () => {
  it('показывает заявки со статусами', async () => {
    renderWithProviders(<RequestsPage />, { route: '/requests' })

    expect(
      await screen.findByRole('heading', { name: 'Заявка на отгул' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Запрос доступа' })).toBeInTheDocument()
    expect(screen.getByText('ABS-1001', { exact: false })).toBeInTheDocument()

    const list = screen.getByRole('list', { name: 'Список заявок' })
    expect(within(list).getByText('Готово')).toBeInTheDocument()
    expect(within(list).getByText('Отменено')).toBeInTheDocument()
  })

  it('фильтрует по статусу', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RequestsPage />, { route: '/requests' })

    await screen.findByRole('heading', { name: 'Заявка на отгул' })

    await user.click(screen.getByRole('button', { name: 'Отменено' }))

    expect(screen.queryByRole('heading', { name: 'Заявка на отгул' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Запрос доступа' })).toBeInTheDocument()
  })

  it('фильтрует по типу действия и сбрасывает фильтры', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RequestsPage />, { route: '/requests' })

    await screen.findByRole('heading', { name: 'Заявка на отгул' })

    await user.selectOptions(screen.getByLabelText('Тип действия'), 'access.request')

    expect(screen.queryByRole('heading', { name: 'Заявка на отгул' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Запрос доступа' })).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Тип действия'), 'absence.create')

    expect(screen.getByRole('heading', { name: 'Заявка на отгул' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Запрос доступа' })).not.toBeInTheDocument()
  })

  it('открывает детали с историей статусов', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RequestsPage />, { route: '/requests' })

    await screen.findByRole('heading', { name: 'Заявка на отгул' })

    await user.click(screen.getAllByRole('button', { name: 'Подробнее' })[0])

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Параметры')).toBeInTheDocument()
    expect(within(dialog).getByText('ABS-1001')).toBeInTheDocument()
    expect(within(dialog).getByText('История')).toBeInTheDocument()
    expect(within(dialog).getByText('Согласовано руководителем')).toBeInTheDocument()
  })

  it('показывает пустое состояние', async () => {
    server.use(http.get('*/api/v1/actions', () => HttpResponse.json({ items: [] })))

    renderWithProviders(<RequestsPage />, { route: '/requests' })

    expect(await screen.findByText('Заявок пока нет')).toBeInTheDocument()
  })

  it('показывает ошибку загрузки', async () => {
    server.use(
      http.get('*/api/v1/actions', () =>
        HttpResponse.json(
          {
            error: {
              code: 'INTERNAL',
              message: 'Сервис недоступен',
              request_id: 'req_actions',
            },
          },
          { status: 500 },
        ),
      ),
    )

    renderWithProviders(<RequestsPage />, { route: '/requests' })

    expect(await screen.findByText('Не удалось загрузить заявки')).toBeInTheDocument()
  })
})
