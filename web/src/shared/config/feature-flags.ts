export const featureFlags = {
  mentorPage: import.meta.env.VITE_FEATURE_MENTOR_PAGE === 'true',
} as const
