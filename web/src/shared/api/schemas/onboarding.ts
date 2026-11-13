import { z } from 'zod'

import { ActionTypeSchema } from './action'

export const StepStatusSchema = z.enum(['done', 'in_progress', 'pending'])

export type StepStatus = z.infer<typeof StepStatusSchema>

export const OnboardingStepSchema = z.object({
  code: z.string(),
  title: z.string(),
  description: z.string().nullish(),
  status: StepStatusSchema,
  order: z.number().int().min(1),
  action_type: ActionTypeSchema.nullish(),
})

export type OnboardingStep = z.infer<typeof OnboardingStepSchema>

export const OnboardingStageSchema = z.object({
  code: z.string(),
  title: z.string(),
  order: z.number().int().min(1),
  steps: z.array(OnboardingStepSchema),
})

export type OnboardingStage = z.infer<typeof OnboardingStageSchema>

export const NextStepSchema = z.object({
  stage_code: z.string(),
  step_code: z.string(),
  title: z.string(),
  prompt: z.string().nullish(),
})

export type NextStep = z.infer<typeof NextStepSchema>

export const OnboardingProgressSchema = z.object({
  completed: z.number().int().min(0),
  total: z.number().int().min(0),
  percent: z.number().int().min(0).max(100),
})

export type OnboardingProgress = z.infer<typeof OnboardingProgressSchema>

export const OnboardingSchema = z.object({
  stages: z.array(OnboardingStageSchema),
  next_step: NextStepSchema.nullish(),
  progress: OnboardingProgressSchema,
})

export type Onboarding = z.infer<typeof OnboardingSchema>
