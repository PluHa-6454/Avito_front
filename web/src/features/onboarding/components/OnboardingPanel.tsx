import { CheckCircle2, Circle, CircleDot, ListChecks, Play, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { Onboarding, StepStatus } from '@/shared/api/schemas'
import { isApiError } from '@/shared/api/errors'
import { EmptyState } from '@/shared/components/EmptyState'
import { ErrorState } from '@/shared/components/ErrorState'
import { LoadingState } from '@/shared/components/LoadingState'
import { NoAccessState } from '@/shared/components/NoAccessState'
import { StatusBadge } from '@/shared/components/StatusBadge'

import { resolveStepPrompt } from '../prompts'

const STEP_ICONS: Record<StepStatus, typeof Circle> = {
  done: CheckCircle2,
  in_progress: CircleDot,
  pending: Circle,
}

type OnboardingPanelProps = {
  onboarding: Onboarding | undefined
  isLoading?: boolean
  error?: unknown
  startDisabled?: boolean
  onRetry?: () => void
  onStart: (prompt: string) => void
  className?: string
}

export function OnboardingPanel({
  onboarding,
  isLoading,
  error,
  startDisabled,
  onRetry,
  onStart,
  className,
}: OnboardingPanelProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="size-4 text-primary" aria-hidden="true" />
            Онбординг
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingState label="Загружаем этапы онбординга" rows={4} />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    const forbidden = isApiError(error) && error.status === 403

    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="size-4 text-primary" aria-hidden="true" />
            Онбординг
          </CardTitle>
        </CardHeader>
        <CardContent>
          {forbidden ? (
            <NoAccessState
              title="Чек-лист недоступен"
              description="У вашей роли нет доступа к этапам адаптации."
              hint={isApiError(error) ? error.hint : null}
              className="border-0 px-0 py-4"
            />
          ) : (
            <ErrorState
              error={error}
              title="Не удалось загрузить онбординг"
              onRetry={onRetry}
              className="border-0 px-0 py-4"
            />
          )}
        </CardContent>
      </Card>
    )
  }

  if (!onboarding || onboarding.stages.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="size-4 text-primary" aria-hidden="true" />
            Онбординг
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={ListChecks}
            title="Нет этапов адаптации"
            description="Как только наставник назначит план, этапы появятся здесь."
            className="border-0 px-0 py-4"
          />
        </CardContent>
      </Card>
    )
  }

  const { progress, next_step: nextStep } = onboarding
  const allDone = progress.total > 0 && progress.completed === progress.total

  return (
    <Card className={className}>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="size-4 text-primary" aria-hidden="true" />
            Онбординг
          </CardTitle>
          <span className="text-xs font-semibold text-muted-foreground">
            {progress.completed} из {progress.total}
          </span>
        </div>
        <CardDescription>
          {allDone ? 'Все шаги выполнены — отличная работа!' : 'Ваш путь адаптации в команде.'}
        </CardDescription>

        <div
          role="progressbar"
          aria-label="Прогресс онбординга"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress.percent}
          className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {nextStep ? (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-primary">
              <Sparkles className="size-3.5" aria-hidden="true" />
              Следующий шаг
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">{nextStep.title}</p>
            <Button
              type="button"
              size="sm"
              className="mt-2.5"
              disabled={startDisabled}
              onClick={() => onStart(resolveStepPrompt(nextStep))}
            >
              <Play className="size-3.5" aria-hidden="true" />
              Начать
            </Button>
          </div>
        ) : (
          <p className="rounded-xl border border-success/30 bg-success/5 px-3 py-2.5 text-sm text-success">
            Все шаги онбординга выполнены.
          </p>
        )}

        <div className="space-y-4">
          {onboarding.stages.map((stage) => (
            <section key={stage.code} aria-label={stage.title} className="space-y-1.5">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {stage.title}
              </h3>
              <ul className="space-y-1">
                {stage.steps.map((step) => {
                  const Icon = STEP_ICONS[step.status]
                  const isNext = nextStep?.step_code === step.code

                  return (
                    <li
                      key={step.code}
                      className={cn(
                        'flex items-start gap-2 rounded-lg px-2 py-1.5',
                        isNext && 'bg-accent/60',
                      )}
                    >
                      <Icon
                        className={cn(
                          'mt-0.5 size-3.5 shrink-0',
                          step.status === 'done' && 'text-success',
                          step.status === 'in_progress' && 'text-primary',
                          step.status === 'pending' && 'text-muted-foreground',
                        )}
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            'text-xs leading-snug',
                            step.status === 'done'
                              ? 'text-muted-foreground line-through'
                              : 'text-foreground',
                            isNext && 'font-semibold',
                          )}
                        >
                          {step.title}
                        </p>
                      </div>
                      <StatusBadge status={step.status} className="shrink-0 text-[10px]" />
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
