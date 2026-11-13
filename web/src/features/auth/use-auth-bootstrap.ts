import { useEffect } from 'react'
import { toast } from 'sonner'

import { AUTH_UNAUTHORIZED_EVENT } from '@/shared/api/client'

import { useAuthStore } from './auth-store'

export function useAuthBootstrap() {
  const hydrate = useAuthStore((state) => state.hydrate)

  useEffect(() => {
    void hydrate()

    const handleUnauthorized = () => {
      const status = useAuthStore.getState().status
      useAuthStore.getState().logout()

      if (status === 'authenticated') {
        toast.error('Сессия истекла. Войдите снова.')
      }
    }

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized)

    return () => {
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized)
    }
  }, [hydrate])
}
