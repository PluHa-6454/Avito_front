const timeFormatter = new Intl.DateTimeFormat('ru-RU', {
  hour: '2-digit',
  minute: '2-digit',
})

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
})

export function formatTime(value: string): string {
  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? '' : timeFormatter.format(date)
}

export function formatDate(value: string): string {
  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? '' : dateFormatter.format(date)
}
