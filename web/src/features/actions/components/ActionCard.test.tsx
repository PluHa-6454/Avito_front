import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { mockStore } from '@/mocks/core/store'
import { setAuthToken } from '@/shared/api/token'
import type { ActionType } from '@/shared/api/schemas'
import { renderWithProviders } from '@/test/utils'
import { server } from '@/test/server'

import { ActionCard } from './ActionCard'

function createDraft(type: ActionType = 'absence.create', fields?: Record<string, unknown>) {
  return mockStore.createAction(
    'u_intern_a',
    type,
    fields ?? { date: '2026-11-20', reason: 'Семейные обстоятельства' },
  )
}

beforeEach(() => {
  setAuthToken('mock.u_intern_a')
})

describe('карточка действия', () => {
  it('показывает поля черновика и подтверждает действие', async () => {
    const action = createDraft()
    const user = userEvent.setup()
    const onEdit = vi.fn()

    const { queryClient } = renderWithProviders(
      <ActionCard
        actionId={action.id}
        type="absence.create"
        fields={action.fields}
        onEdit={onEdit}
      />,
    )
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    expect(await screen.findByText('2026-11-20')).toBeInTheDocument()
    expect(screen.getByText('Семейные обстоятельства')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Подтвердить' }))

    expect(await screen.findByText('ABS-1024')).toBeInTheDocument()
    expect(screen.getByText('Ожидает согласования')).toBeInTheDocument()
    expect(screen.getByText('Мария Петрова')).toBeInTheDocument()
    expect(mockStore.findAction(action.id)?.status).toBe('done')

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['onboarding'] })
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['actions'] })
    })
  })

  it('защищает от двойного клика по «Подтвердить»', async () => {
    const action = createDraft()
    let calls = 0

    server.use(
      http.post('*/api/v1/actions/:actionId/confirm', async ({ request, params }) => {
        calls += 1
        const key = request.headers.get('idempotency-key') ?? ''
        const result = mockStore.confirmAction(
          'u_intern_a',
          String(params.actionId),
          key,
        )

        if (!result.ok) {
          return HttpResponse.json(
            {
              error: {
                code: 'CONFLICT',
                message: 'Действие уже выполнено',
                request_id: 'req_test',
              },
              action: result.action,
            },
            { status: 409 },
          )
        }

        return HttpResponse.json({ action: result.action })
      }),
    )

    renderWithProviders(
      <ActionCard
        actionId={action.id}
        type="absence.create"
        fields={action.fields}
        onEdit={vi.fn()}
      />,
    )

    const confirm = await screen.findByRole('button', { name: 'Подтвердить' })

    fireEvent.click(confirm)
    fireEvent.click(confirm)

    await waitFor(() => {
      expect(mockStore.findAction(action.id)?.status).toBe('done')
    })

    expect(calls).toBe(1)
  })

  it('повторяет подтверждение с тем же Idempotency-Key', async () => {
    const action = createDraft()
    const keys: string[] = []
    let calls = 0

    server.use(
      http.post('*/api/v1/actions/:actionId/confirm', async ({ request, params }) => {
        calls += 1
        const key = request.headers.get('idempotency-key') ?? ''
        keys.push(key)

        if (calls === 1) {
          return HttpResponse.json(
            {
              error: {
                code: 'INTERNAL',
                message: 'Сервис временно недоступен',
                request_id: 'req_retry',
              },
            },
            { status: 503 },
          )
        }

        const result = mockStore.confirmAction('u_intern_a', String(params.actionId), key)

        if (!result.ok) {
          return HttpResponse.json(
            {
              error: {
                code: 'CONFLICT',
                message: 'Действие уже выполнено',
                request_id: 'req_conflict',
              },
              action: result.action,
            },
            { status: 409 },
          )
        }

        return HttpResponse.json({ action: result.action })
      }),
    )

    const user = userEvent.setup()
    renderWithProviders(
      <ActionCard
        actionId={action.id}
        type="absence.create"
        fields={action.fields}
        onEdit={vi.fn()}
      />,
    )

    await user.click(await screen.findByRole('button', { name: 'Подтвердить' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Повторить' }))

    expect(await screen.findByText('ABS-1024')).toBeInTheDocument()
    expect(keys).toHaveLength(2)
    expect(keys[0]).toBe(keys[1])
  })

  it('показывает сохранённый результат при 409', async () => {
    const action = createDraft()
    const user = userEvent.setup()

    renderWithProviders(
      <ActionCard
        actionId={action.id}
        type="absence.create"
        fields={action.fields}
        onEdit={vi.fn()}
      />,
    )

    const confirm = await screen.findByRole('button', { name: 'Подтвердить' })

    mockStore.confirmAction('u_intern_a', action.id, '11111111-1111-4111-8111-111111111111')

    await user.click(confirm)

    expect(await screen.findByText('ABS-1024')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Подтвердить' })).not.toBeInTheDocument()
  })

  it('отменяет черновик', async () => {
    const action = createDraft()
    const user = userEvent.setup()

    renderWithProviders(
      <ActionCard
        actionId={action.id}
        type="absence.create"
        fields={action.fields}
        onEdit={vi.fn()}
      />,
    )

    await user.click(await screen.findByRole('button', { name: 'Отменить' }))

    await waitFor(() => {
      expect(mockStore.findAction(action.id)?.status).toBe('cancelled')
    })

    expect(screen.queryByRole('button', { name: 'Подтвердить' })).not.toBeInTheDocument()
  })

  it('«Изменить» отменяет черновик и подставляет текст в чат', async () => {
    const action = createDraft()
    const onEdit = vi.fn()
    const user = userEvent.setup()

    renderWithProviders(
      <ActionCard
        actionId={action.id}
        type="absence.create"
        fields={action.fields}
        onEdit={onEdit}
      />,
    )

    await user.click(await screen.findByRole('button', { name: 'Изменить' }))

    await waitFor(() => {
      expect(mockStore.findAction(action.id)?.status).toBe('cancelled')
    })

    expect(onEdit).toHaveBeenCalledWith(
      'Хочу оформить отгул на 2026-11-20. Причина: Семейные обстоятельства',
    )
  })

  it('показывает ошибку валидации без изменения статуса', async () => {
    const action = createDraft('access.request', {
      resource: 'Admin panel',
      justification: 'Нужен для отчётов',
    })

    server.use(
      http.post('*/api/v1/actions/:actionId/confirm', () =>
        HttpResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Ресурс недоступен вашей роли',
              hint: 'Обратитесь к наставнику',
              request_id: 'req_422',
            },
          },
          { status: 422 },
        ),
      ),
    )

    const user = userEvent.setup()
    renderWithProviders(
      <ActionCard
        actionId={action.id}
        type="access.request"
        fields={action.fields}
        onEdit={vi.fn()}
      />,
    )

    await user.click(await screen.findByRole('button', { name: 'Подтвердить' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Проверьте данные и попробуйте снова.')).toBeInTheDocument()
    expect(screen.getByText('Обратитесь к наставнику')).toBeInTheDocument()
    expect(mockStore.findAction(action.id)?.status).toBe('draft')
  })
})
