import { beforeEach, describe, expect, it } from 'vitest'

import { MockStore } from './store'

describe('mock store', () => {
  let store: MockStore

  beforeEach(() => {
    store = new MockStore()
  })

  it('возвращает тот же результат при повторе с тем же Idempotency-Key', () => {
    const action = store.createAction('u_intern_a', 'absence.create', { date: '2026-11-20' })

    const first = store.confirmAction('u_intern_a', action.id, 'key-1')
    const second = store.confirmAction('u_intern_a', action.id, 'key-1')

    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)

    if (first.ok && second.ok) {
      expect(second.action).toEqual(first.action)
      expect(second.action.status).toBe('done')
    }
  })

  it('возвращает конфликт при повторе с другим ключом', () => {
    const action = store.createAction('u_intern_a', 'absence.create', { date: '2026-11-20' })
    store.confirmAction('u_intern_a', action.id, 'key-1')

    const second = store.confirmAction('u_intern_a', action.id, 'key-2')

    expect(second).toMatchObject({ ok: false, reason: 'conflict' })
  })

  it('не даёт подтвердить чужое действие', () => {
    const action = store.createAction('u_intern_b', 'absence.create', { date: '2026-11-20' })

    expect(store.confirmAction('u_intern_a', action.id, 'key-1')).toMatchObject({
      ok: false,
      reason: 'forbidden',
    })
  })

  it('отменяет черновик и повторяет отмену идемпотентно', () => {
    const action = store.createAction('u_intern_a', 'absence.create', { date: '2026-11-20' })

    const first = store.cancelAction('u_intern_a', action.id)
    const second = store.cancelAction('u_intern_a', action.id)

    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)

    if (first.ok && second.ok) {
      expect(first.action.status).toBe('cancelled')
      expect(second.action).toEqual(first.action)
    }
  })

  it('закрывает шаг онбординга после успешного действия', () => {
    const before = store.getOnboarding('u_intern_a')
    expect(before?.stages[0].steps[1]).toMatchObject({
      code: 'get_access',
      status: 'in_progress',
    })

    const action = store.createAction('u_intern_a', 'access.request', { resource: 'GitLab' })
    store.confirmAction('u_intern_a', action.id, 'key-1')

    const after = store.getOnboarding('u_intern_a')
    expect(after?.stages[0].steps[1].status).toBe('done')
    expect(after?.progress.completed).toBeGreaterThan(before?.progress.completed ?? 0)
    expect(after?.next_step?.step_code).toBe('first_task')
  })

  it('обновляет оценку сообщения без дублей', () => {
    const message = store.findMessage('msg_seed_1')
    expect(message).toBeDefined()

    const first = store.addFeedback('u_intern_a', 'msg_seed_1', { rating: 'up' })
    const second = store.addFeedback('u_intern_a', 'msg_seed_1', {
      rating: 'down',
      comment: 'Не хватило ссылки',
    })

    expect(first?.id).toBe(second?.id)
    expect(second?.rating).toBe('down')
    expect(store.findMessage('msg_seed_1')?.feedback?.rating).toBe('down')
  })
})
