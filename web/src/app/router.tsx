import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'

import { RequireAuth } from '@/features/auth/RequireAuth'
import { LoadingState } from '@/shared/components/LoadingState'
import { AppShell } from '@/shared/components/AppShell'

const ChatPage = lazy(() =>
  import('@/pages/chat/ChatPage').then((module) => ({ default: module.ChatPage })),
)
const LoginPage = lazy(() =>
  import('@/pages/login/LoginPage').then((module) => ({ default: module.LoginPage })),
)
const NotFoundPage = lazy(() =>
  import('@/pages/not-found/NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
)
const OnboardingPage = lazy(() =>
  import('@/pages/onboarding/OnboardingPage').then((module) => ({ default: module.OnboardingPage })),
)
const RequestsPage = lazy(() =>
  import('@/pages/requests/RequestsPage').then((module) => ({ default: module.RequestsPage })),
)

export function AppRoutes() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md py-16">
          <LoadingState label="Загружаем страницу" />
        </div>
      }
    >
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<ChatPage />} />
          <Route path="requests" element={<RequestsPage />} />
          <Route path="onboarding" element={<OnboardingPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
