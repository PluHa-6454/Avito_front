import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'

import { mockStore } from '@/mocks/core/store'
import { setAuthToken } from '@/shared/api/token'
import type { SseEvent } from '@/shared/api/schemas'
import { renderWithProviders } from '@/test/utils'
import { server } from '@/test/server'
import { sseResponse, sseText } from '@/test/sse'

import { ChatPage } from './ChatPage'

const GREETING = /Привет! Я AI-buddy — помощник по адаптации/

const done: SseEvent = { type: 'done', data: { message_id: 'msg_test' } }

beforeEach(() => {
  setAuthToken('mock.u_intern_a')
})

describe('страница чата', () => {
  it('загружает историю диалога', async () => {
    renderWithProviders(<ChatPage />, { route: '/' })

    expect(await screen.findByText(GREETING)).toBeInTheDocument()
    expect(screen.getByText('Первый день')).toBeInTheDocument()
  })

  it('показывает сообщение пользователя и ответ с источниками', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ChatPage />, { route: '/' })

    await screen.findByText(GREETING)

    await user.type(screen.getByLabelText('Сообщение'), 'Как устроено код-ревью?')
    await user.click(screen.getByRole('button', { name: 'Отправить сообщение' }))

    expect(await screen.findByText('Как устроено код-ревью?')).toBeInTheDocument()

    const answers = await screen.findAllByText(/Код-ревью проходит в два этапа/)
    expect(answers.length).toBeGreaterThan(0)

    expect(await screen.findByText('Код-ревью в команде A')).toBeInTheDocument()
    expect(screen.getAllByText('тестовый').length).toBeGreaterThan(0)
  })

  it('сохраняет оценку ответа', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ChatPage />, { route: '/' })

    await screen.findByText(GREETING)

    const buttons = await screen.findAllByRole('button', { name: 'Ответ полезен' })
    await user.click(buttons[0])

    await waitFor(() => {
      expect(mockStore.findMessage('msg_seed_1')?.feedback?.rating).toBe('up')
    })

    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true')
  })

  it('сохраняет комментарий к оценке «не помог»', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ChatPage />, { route: '/' })

    await screen.findByText(GREETING)

    const buttons = await screen.findAllByRole('button', { name: 'Ответ не помог' })
    await user.click(buttons[0])

    expect(await screen.findByRole('dialog')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Комментарий'), 'Мало ссылок на регламент')
    await user.click(screen.getByRole('button', { name: 'Отправить оценку' }))

    await waitFor(() => {
      expect(mockStore.findMessage('msg_seed_1')?.feedback).toMatchObject({
        rating: 'down',
        comment: 'Мало ссылок на регламент',
      })
    })
  })

  it('показывает сообщение пользователя до ответа и позволяет остановить стрим', async () => {
    server.use(
      http.post('*/api/v1/conversations/:conversationId/messages', () => {
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(
                'event: status\ndata: {"stage":"llm","text":"готовлю ответ"}\n\n',
              ),
            )
          },
        })

        return new HttpResponse(stream, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
        })
      }),
    )

    const user = userEvent.setup()
    renderWithProviders(<ChatPage />, { route: '/' })

    await screen.findByText(GREETING)

    await user.type(screen.getByLabelText('Сообщение'), 'Расскажи медленно и подробно')
    await user.click(screen.getByRole('button', { name: 'Отправить сообщение' }))

    expect(await screen.findByText('Расскажи медленно и подробно')).toBeInTheDocument()

    const stop = await screen.findByRole('button', { name: 'Остановить' })
    await user.click(stop)

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Остановить' })).not.toBeInTheDocument()
    })
  })

  it('показывает ошибку LLM и повторяет запрос с тем же client_message_id', async () => {
    const bodies: Array<{ client_message_id: string }> = []
    let calls = 0

    server.use(
      http.post('*/api/v1/conversations/:conversationId/messages', async ({ request }) => {
        const body = (await request.clone().json()) as { client_message_id: string }
        bodies.push(body)
        calls += 1

        if (calls === 1) {
          return sseResponse([
            sseText([
              { type: 'status', data: { stage: 'llm', text: 'готовлю ответ' } },
              {
                type: 'error',
                data: { code: 'LLM_UNAVAILABLE', message: 'AI временно недоступен' },
              },
            ]),
          ])
        }

        return sseResponse([
          sseText([
            { type: 'token', data: { text: 'Повторный ответ' } },
            done,
          ]),
        ])
      }),
    )

    const user = userEvent.setup()
    renderWithProviders(<ChatPage />, { route: '/' })

    await screen.findByText(GREETING)

    await user.type(screen.getByLabelText('Сообщение'), 'Ошибка')
    await user.click(screen.getByRole('button', { name: 'Отправить сообщение' }))

    expect(await screen.findByText('Не удалось получить ответ')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Повторить' }))

    expect(await screen.findByText('Повторный ответ')).toBeInTheDocument()
    expect(bodies).toHaveLength(2)
    expect(bodies[0].client_message_id).toBe(bodies[1].client_message_id)
  })

  it('показывает таймер при 429', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ChatPage />, { route: '/' })

    await screen.findByText(GREETING)

    await user.type(screen.getByLabelText('Сообщение'), 'Покажи лимит')
    await user.click(screen.getByRole('button', { name: 'Отправить сообщение' }))

    expect(await screen.findByText('Слишком много запросов. Попробуйте позже.')).toBeInTheDocument()

    const retry = await screen.findByRole('button', { name: /Повторить через \d+ с/ })
    expect(retry).toBeDisabled()
  })

  it('создаёт диалог при первом сообщении', async () => {
    setAuthToken('mock.u_intern_b')
    const user = userEvent.setup()
    renderWithProviders(<ChatPage />, { route: '/' })

    expect(await screen.findByText('Спросите AI-buddy')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /устроено код-ревью/ }))

    const answers = await screen.findAllByText(/Код-ревью проходит в два этапа/)
    expect(answers.length).toBeGreaterThan(0)
    expect(mockStore.listConversations('u_intern_b')).toHaveLength(1)
  })

  it('показывает черновик заявки на отгул и подтверждает его', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ChatPage />, { route: '/' })

    await screen.findByText(GREETING)

    await user.type(screen.getByLabelText('Сообщение'), 'Хочу взять отгул в пятницу')
    await user.click(screen.getByRole('button', { name: 'Отправить сообщение' }))

    expect(
      await screen.findByRole('region', { name: 'Карточка действия: Заявка на отгул' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Подтвердить' }))

    expect(await screen.findByText('ABS-1024')).toBeInTheDocument()
    expect(screen.getByText('Ожидает согласования')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Подтвердить' })).not.toBeInTheDocument()
  })
})
