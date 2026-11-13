import '@testing-library/jest-dom/vitest'

// Прогреваем ленивые маршруты, чтобы Suspense успевал разрешиться в тестах.
import '@/pages/chat/ChatPage'
import '@/pages/login/LoginPage'
import '@/pages/not-found/NotFoundPage'
import '@/pages/onboarding/OnboardingPage'
import '@/pages/requests/RequestsPage'

import { cleanup, configure } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'

import { mockStore } from '@/mocks/core/store'
import { resetAuthStore } from '@/features/auth/auth-store'
import { clearAuthToken } from '@/shared/api/token'

import { server } from './server'

configure({ asyncUtilTimeout: 3000 })

afterEach(() => {
  cleanup()
  server.resetHandlers()
  mockStore.reset()
  resetAuthStore()
  clearAuthToken()
})

beforeAll(() => {
  server.listen()

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })

  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver

  window.HTMLElement.prototype.scrollIntoView = vi.fn()

  if (!window.PointerEvent) {
    window.PointerEvent = MouseEvent as unknown as typeof PointerEvent
  }
})

afterAll(() => {
  server.close()
})
