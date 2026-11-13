import type { Onboarding, OnboardingStage, User } from '../../shared/api/schemas'

const PROMPTS: Record<string, string> = {
  meet_team: 'Расскажи про команду и наставника',
  get_access: 'Какие доступы мне нужны?',
  first_task: 'Какую задачу взять первой?',
  first_review: 'Как у нас устроено код-ревью?',
  first_absence: 'Как оформить отгул?',
  month_feedback: 'Как проходит встреча по итогам первого месяца?',
}

function buildInternStages(): OnboardingStage[] {
  return [
    {
      code: 'day_1',
      title: 'День 1',
      order: 1,
      steps: [
        {
          code: 'meet_team',
          title: 'Познакомиться с командой',
          description: 'Состав команды, наставник и каналы связи.',
          status: 'done',
          order: 1,
          action_type: null,
        },
        {
          code: 'get_access',
          title: 'Получить доступы',
          description: 'GitLab, Wiki и таск-трекер.',
          status: 'in_progress',
          order: 2,
          action_type: 'access.request',
        },
      ],
    },
    {
      code: 'week_1',
      title: 'Первая неделя',
      order: 2,
      steps: [
        {
          code: 'first_task',
          title: 'Взять первую задачу',
          description: 'Выберите задачу из очереди команды.',
          status: 'pending',
          order: 1,
          action_type: 'tasks.transition',
        },
        {
          code: 'first_review',
          title: 'Пройти первое код-ревью',
          description: 'Отправьте изменения на ревью и обсудите замечания.',
          status: 'pending',
          order: 2,
          action_type: null,
        },
        {
          code: 'first_absence',
          title: 'Оформить отгул',
          description: 'Проверьте, как работает заявка на отгул.',
          status: 'pending',
          order: 3,
          action_type: 'absence.create',
        },
      ],
    },
    {
      code: 'month_1',
      title: 'Первый месяц',
      order: 3,
      steps: [
        {
          code: 'month_feedback',
          title: 'Встреча по итогам месяца',
          description: 'Обсудите прогресс и планы с наставником.',
          status: 'pending',
          order: 1,
          action_type: null,
        },
      ],
    },
  ]
}

export function withProgress(stages: OnboardingStage[]): Onboarding {
  const allSteps = stages.flatMap((stage) => stage.steps)
  const completed = allSteps.filter((step) => step.status === 'done').length
  const total = allSteps.length
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100)

  const nextStage = stages.find((stage) => stage.steps.some((step) => step.status !== 'done'))
  const nextStep = nextStage?.steps.find((step) => step.status !== 'done')

  return {
    stages,
    next_step:
      nextStage && nextStep
        ? {
            stage_code: nextStage.code,
            step_code: nextStep.code,
            title: nextStep.title,
            prompt: PROMPTS[nextStep.code] ?? `Расскажи, как выполнить шаг «${nextStep.title}»`,
          }
        : null,
    progress: { completed, total, percent },
  }
}

export function createOnboardingTemplate(user: User): Onboarding {
  if (user.role !== 'intern') {
    const stages = buildInternStages().map((stage) => ({
      ...stage,
      steps: stage.steps.map((step) => ({ ...step, status: 'done' as const })),
    }))

    return withProgress(stages)
  }

  return withProgress(buildInternStages())
}
