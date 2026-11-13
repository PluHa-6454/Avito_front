import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold text-primary">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Страница не найдена</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Возможно, ссылка устарела или раздел отключён.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Вернуться в чат</Link>
        </Button>
      </div>
    </main>
  )
}
