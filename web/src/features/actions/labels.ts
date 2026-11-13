import type { ActionStatus, ActionType } from '@/shared/api/schemas'

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  'absence.create': 'Заявка на отгул',
  'access.request': 'Запрос доступа',
  'tasks.transition': 'Перевод задачи',
  'mentor.ask': 'Вопрос наставнику',
}

export const ACTION_TYPE_HINTS: Record<ActionType, string> = {
  'absence.create': 'Заявка уйдёт руководителю только после подтверждения.',
  'access.request': 'Согласующий увидит запрос только после подтверждения.',
  'tasks.transition': 'Задача изменит статус только после подтверждения.',
  'mentor.ask': 'Обращение к наставнику отправится только после подтверждения.',
}

const FIELD_LABELS: Record<ActionType, Array<{ key: string; label: string }>> = {
  'absence.create': [
    { key: 'date', label: 'Дата' },
    { key: 'reason', label: 'Причина' },
  ],
  'access.request': [
    { key: 'resource', label: 'Ресурс' },
    { key: 'justification', label: 'Обоснование' },
  ],
  'tasks.transition': [
    { key: 'task_id', label: 'Задача' },
    { key: 'to_status', label: 'Новый статус' },
  ],
  'mentor.ask': [{ key: 'question', label: 'Вопрос' }],
}

const TASK_STATUS_LABELS: Record<string, string> = {
  in_progress: 'В работе',
  review: 'На проверке',
  done: 'Готово',
}

export function getFieldRows(
  type: ActionType,
  fields: Record<string, unknown>,
): Array<{ label: string; value: string }> {
  return FIELD_LABELS[type]
    .map(({ key, label }) => {
      const raw = fields[key]

      if (raw === undefined || raw === null || raw === '') {
        return null
      }

      const value =
        key === 'to_status' ? (TASK_STATUS_LABELS[String(raw)] ?? String(raw)) : String(raw)

      return { label, value }
    })
    .filter((row): row is { label: string; value: string } => row !== null)
}

const RESULT_STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидает согласования',
  approved: 'Согласовано',
  sent: 'Отправлено',
  in_progress: 'В работе',
  done: 'Готово',
}

export function getResultRows(result: Record<string, unknown>): Array<{
  label: string
  value: string
}> {
  const rows: Array<{ label: string; value: string }> = []

  if (typeof result.number === 'string') {
    rows.push({ label: 'Номер заявки', value: result.number })
  }

  if (typeof result.task_id === 'string') {
    rows.push({ label: 'Задача', value: result.task_id })
  }

  if (typeof result.request_id === 'string') {
    rows.push({ label: 'Номер обращения', value: result.request_id })
  }

  if (typeof result.status === 'string') {
    rows.push({ label: 'Статус', value: RESULT_STATUS_LABELS[result.status] ?? result.status })
  }

  if (typeof result.approver === 'string') {
    rows.push({ label: 'Согласующий', value: result.approver })
  }

  if (typeof result.mentor === 'string') {
    rows.push({ label: 'Наставник', value: result.mentor })
  }

  return rows
}

export function buildEditPrefill(type: ActionType, fields: Record<string, unknown>): string {
  switch (type) {
    case 'absence.create':
      return `Хочу оформить отгул на ${String(fields.date ?? '')}. Причина: ${String(fields.reason ?? '')}`
    case 'access.request':
      return `Нужен доступ к ${String(fields.resource ?? '')}. Обоснование: ${String(fields.justification ?? '')}`
    case 'tasks.transition':
      return `Переведи задачу ${String(fields.task_id ?? '')} в статус ${TASK_STATUS_LABELS[String(fields.to_status)] ?? String(fields.to_status ?? '')}`
    case 'mentor.ask':
      return String(fields.question ?? '')
  }
}

export function isActionOpen(status: ActionStatus): boolean {
  return status === 'draft' || status === 'confirmed' || status === 'executing'
}
