import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/shared/api/errors'

import { ErrorState } from './ErrorState'
import { LoadingState } from './LoadingState'
import { NoAccessState } from './NoAccessState'
import { RoleChip } from './RoleChip'
import { StatusBadge } from './StatusBadge'
import { SyntheticBadge } from './SyntheticBadge'

describe('базовые состояния', () => {
  it('показывает метку синтетических данных', () => {
    render(<SyntheticBadge />)

    expect(screen.getByText('тестовый')).toBeInTheDocument()
  })

  it('показывает роль и команду', () => {
    render(<RoleChip role="intern" teamName="Команда A" />)

    expect(screen.getByText('Стажёр')).toBeInTheDocument()
    expect(screen.getByText('· Команда A')).toBeInTheDocument()
  })

  it('переводит статусы в русские подписи', () => {
    const { rerender } = render(<StatusBadge status="draft" />)
    expect(screen.getByText('Черновик')).toBeInTheDocument()

    rerender(<StatusBadge status="done" />)
    expect(screen.getByText('Готово')).toBeInTheDocument()

    rerender(<StatusBadge status="cancelled" />)
    expect(screen.getByText('Отменено')).toBeInTheDocument()
  })

  it('показывает ошибку с подсказкой и request_id', () => {
    const error = new ApiError({
      code: 'FORBIDDEN',
      message: 'Нет доступа к действию',
      hint: 'Обратитесь к наставнику',
      requestId: 'req_123',
      status: 403,
    })

    render(<ErrorState error={error} onRetry={vi.fn()} />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('У вас нет доступа к этому действию.')).toBeInTheDocument()
    expect(screen.getByText('Обратитесь к наставнику')).toBeInTheDocument()
    expect(screen.getByText('request_id: req_123')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeInTheDocument()
  })

  it('вызывает retry', async () => {
    const onRetry = vi.fn()
    render(<ErrorState onRetry={onRetry} />)

    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('показывает состояние «нет доступа»', () => {
    render(<NoAccessState hint="Напишите наставнику" />)

    expect(screen.getByText('Нет доступа')).toBeInTheDocument()
    expect(screen.getByText('Напишите наставнику')).toBeInTheDocument()
  })

  it('показывает skeleton с aria-busy', () => {
    render(<LoadingState label="Загружаем онбординг" />)

    const label = screen.getByText('Загружаем онбординг')
    expect(label).toBeInTheDocument()
    expect(label.closest('[aria-busy="true"]')).not.toBeNull()
  })
})
