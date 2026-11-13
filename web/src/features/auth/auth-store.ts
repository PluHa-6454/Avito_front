import { create } from 'zustand'

import { getMe, login as loginRequest } from '@/shared/api/endpoints'
import { isApiError } from '@/shared/api/errors'
import type { User } from '@/shared/api/schemas'
import { clearAuthToken, getAuthToken, setAuthToken } from '@/shared/api/token'

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'anonymous' | 'error'

type AuthState = {
  token: string | null
  user: User | null
  status: AuthStatus
  error: unknown
  login: (email: string) => Promise<void>
  logout: () => void
  hydrate: (force?: boolean) => Promise<void>
  clearError: () => void
}

const initialState = {
  token: null as string | null,
  user: null as User | null,
  status: 'idle' as AuthStatus,
  error: null as unknown,
}

export const useAuthStore = create<AuthState>((set, get) => ({
  ...initialState,

  async login(email) {
    set({ status: 'loading', error: null })

    try {
      const result = await loginRequest(email)
      setAuthToken(result.token)
      set({
        token: result.token,
        user: result.user,
        status: 'authenticated',
        error: null,
      })
    } catch (error) {
      clearAuthToken()
      set({ token: null, user: null, status: 'anonymous', error })
      throw error
    }
  },

  logout() {
    clearAuthToken()
    set({ token: null, user: null, status: 'anonymous', error: null })
  },

  async hydrate(force = false) {
    const token = getAuthToken()

    if (!token) {
      set({ token: null, user: null, status: 'anonymous', error: null })
      return
    }

    const status = get().status

    if (!force && (status === 'loading' || status === 'authenticated')) {
      return
    }

    set({ status: 'loading', token, error: null })

    try {
      const user = await getMe()
      set({ token, user, status: 'authenticated', error: null })
    } catch (error) {
      if (isApiError(error) && error.code === 'UNAUTHORIZED') {
        clearAuthToken()
        set({ token: null, user: null, status: 'anonymous', error })
        return
      }

      set({ status: 'error', error })
    }
  },

  clearError() {
    set({ error: null })
  },
}))

export function resetAuthStore() {
  useAuthStore.setState({ ...initialState })
}
