import type { NextStep } from '@/shared/api/schemas'

const STEP_PROMPTS: Record<string, string> = {
  meet_team: 'Расскажи про команду и наставника',
  get_access: 'Какие доступы мне нужны?',
  first_task: 'Какую задачу взять первой?',
  first_review: 'Как у нас устроено код-ревью?',
  first_absence: 'Как оформить отгул?',
  month_feedback: 'Как проходит встреча по итогам первого месяца?',
}

export function resolveStepPrompt(nextStep: NextStep): string {
  return (
    nextStep.prompt?.trim() ||
    STEP_PROMPTS[nextStep.step_code] ||
    `Расскажи, как выполнить шаг «${nextStep.title}»`
  )
}
