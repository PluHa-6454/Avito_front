import { useEffect } from 'react'

import { AppRoutes } from '@/app/router'
import { useAuthBootstrap } from '@/features/auth/use-auth-bootstrap'
import { ErrorBoundary } from '@/shared/components/ErrorBoundary'

export default function App() {
  useAuthBootstrap()

  useEffect(() => {
    // Предзагружаем второстепенные маршруты, пока пользователь на входе.
    void import('@/pages/requests/RequestsPage')
    void import('@/pages/onboarding/OnboardingPage')
  }, [])

  return (
    <ErrorBoundary>
      <AppRoutes />
    </ErrorBoundary>
  )
}
