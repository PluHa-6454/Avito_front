import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { ErrorState } from '@/shared/components/ErrorState'
import { LoadingState } from '@/shared/components/LoadingState'

import { useAuthStore } from './auth-store'

type RequireAuthProps = {
  children: ReactNode
}

export function RequireAuth({ children }: RequireAuthProps) {
  const status = useAuthStore((state) => state.status)
  const error = useAuthStore((state) => state.error)
  const hydrate = useAuthStore((state) => state.hydrate)
  const location = useLocation()

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="mx-auto max-w-md py-16">
        <LoadingState label="Проверяем сессию" />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="mx-auto max-w-xl py-16">
        <ErrorState
          error={error}
          title="Не удалось проверить сессию"
          onRetry={() => void hydrate(true)}
        />
      </div>
    )
  }

  if (status !== 'authenticated') {
    return (
      <Navigate
        to="/login"
        state={{ returnTo: `${location.pathname}${location.search}` }}
        replace
      />
    )
  }

  return children
}
