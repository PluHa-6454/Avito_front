import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { Onboarding } from '@/shared/api/schemas'
import { ApiError } from '@/shared/api/errors'
import { renderWithProviders } from '@/test/utils'

import { resolveStepPrompt } from '../prompts'

import { OnboardingPanel } from './OnboardingPanel'

const onboarding: Onboarding = {
  stages: [
    {
      code: 'day_1',
      title: 'День 1',
      order: 1,
      steps: [
        {
          code: 'meet_team',
          title: 'Познакомиться с командой',
          status: 'done',
          order: 1,
          action_type: null,
        },
        {
          code: 'get_access',
          title: 'Получить доступы',
          status: 'in_progress',
          order: 2,
          action_type: 'access.request',
        },
      ],
    },
    {
      code: 'week_1',
      title: 'Первая неделя',
      order: 2,
      steps: [
        {
          code: 'first_task',
          title: 'Взять первую задачу',
          status: 'pending',
          order: 1,
          action_type: 'tasks.transition',
        },
      ],
    },
  ],
  next_step: {
    stage_code: 'day_1',
    step_code: 'get_access',
    title: 'Получить доступы',
    prompt: 'Какие доступы мне нужны?',
  },
  progress: { completed: 1, total: 3, percent: 33 },
}

describe('панель онбординга', () => {
  it('показывает прогресс, этапы и следующий шаг', () => {
    renderWithProviders(<OnboardingPanel onboarding={onboarding} onStart={vi.fn()} />)

    expect(screen.getByRole('progressbar', { name: 'Прогресс онбординга' })).toHaveAttribute(
      'aria-valuenow',
      '33',
    )
    expect(screen.getByText('1 из 3')).toBeInTheDocument()
    expect(screen.getByText('Следующий шаг')).toBeInTheDocument()
    expect(screen.getByText('День 1')).toBeInTheDocument()
    expect(screen.getByText('Первая неделя')).toBeInTheDocument()
    expect(screen.getAllByText('Получить доступы').length).toBeGreaterThan(0)
    expect(screen.getByText('В работе')).toBeInTheDocument()
    expect(screen.getAllByText('Ожидает').length).toBeGreaterThan(0)
  })

  it('по кнопке «Начать» отдаёт текст запроса', async () => {
    const onStart = vi.fn()
    const user = userEvent.setup()

    renderWithProviders(<OnboardingPanel onboarding={onboarding} onStart={onStart} />)

    await user.click(screen.getByRole('button', { name: 'Начать' }))

    expect(onStart).toHaveBeenCalledWith('Какие доступы мне нужны?')
  })

  it('подставляет fallback-текст для неизвестного шага', () => {
    expect(
      resolveStepPrompt({
        stage_code: 'custom',
        step_code: 'unknown_step',
        title: 'Сделать что-то',
      }),
    ).toBe('Расскажи, как выполнить шаг «Сделать что-то»')
  })

  it('показывает загрузку', () => {
    renderWithProviders(<OnboardingPanel onboarding={undefined} isLoading onStart={vi.fn()} />)

    expect(screen.getByText('Загружаем этапы онбординга')).toBeInTheDocument()
  })

  it('показывает отсутствие доступа при 403', () => {
    renderWithProviders(
      <OnboardingPanel
        onboarding={undefined}
        error={new ApiError({ code: 'FORBIDDEN', message: 'Нет доступа', status: 403 })}
        onStart={vi.fn()}
      />,
    )

    expect(screen.getByText('Чек-лист недоступен')).toBeInTheDocument()
  })

  it('показывает пустое состояние без этапов', () => {
    renderWithProviders(
      <OnboardingPanel
        onboarding={{ stages: [], next_step: null, progress: { completed: 0, total: 0, percent: 0 } }}
        onStart={vi.fn()}
      />,
    )

    expect(screen.getByText('Нет этапов адаптации')).toBeInTheDocument()
  })
})
