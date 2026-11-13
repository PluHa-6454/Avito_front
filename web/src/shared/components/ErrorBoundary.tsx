import { Component, type ErrorInfo, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ui] render error', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <main className="flex min-h-svh items-center justify-center bg-background p-6">
        <div className="max-w-md text-center">
          <p className="text-sm font-semibold text-destructive">Ошибка интерфейса</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Что-то пошло не так</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Перезагрузите страницу. Если ошибка повторяется, передайте наставнику время и описание
            действия.
          </p>
          <Button className="mt-6" onClick={() => window.location.reload()}>
            Перезагрузить
          </Button>
        </div>
      </main>
    )
  }
}
