import { useQuery } from '@tanstack/react-query'

import { getOnboarding } from '@/shared/api/endpoints'

export const onboardingKeys = {
  all: ['onboarding'] as const,
}

export function useOnboarding() {
  return useQuery({
    queryKey: onboardingKeys.all,
    queryFn: ({ signal }) => getOnboarding(signal),
    refetchOnWindowFocus: true,
  })
}
