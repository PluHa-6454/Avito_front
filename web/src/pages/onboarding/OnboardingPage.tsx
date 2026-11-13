import { CalendarCheck, MessageSquareText, Target } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OnboardingPanel } from '@/features/onboarding/components/OnboardingPanel'
import { useOnboarding } from '@/features/onboarding/queries'
import { PageHeader } from '@/shared/components/PageHeader'

export function OnboardingPage() {
  const navigate = useNavigate()
  const onboardingQuery = useOnboarding()

  function handleStart(prompt: string) {
    navigate('/', { state: { prefill: prompt } })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Онбординг"
        description="Полный чек-лист по этапам: что уже сделано, что в работе и какой шаг следующий."
        actions={
          <Button variant="outline" asChild>
            <a href="#onboarding-checklist">
              <CalendarCheck className="size-4" aria-hidden="true" />
              К чек-листу
            </a>
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div id="onboarding-checklist">
          <OnboardingPanel
            onboarding={onboardingQuery.data}
            isLoading={onboardingQuery.isPending}
            error={onboardingQuery.isError ? onboardingQuery.error : undefined}
            onRetry={() => void onboardingQuery.refetch()}
            onStart={handleStart}
          />
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="size-4 text-primary" aria-hidden="true" />
                Как проходит адаптация
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Шаги закрываются автоматически, когда действие подтверждено в чате.</p>
              <p>Следующий шаг подсвечивается — с него проще всего продолжить.</p>
              <p>Наставник видит прогресс и помогает, если шаг застрял.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquareText className="size-4 text-primary" aria-hidden="true" />
                Нужна помощь?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Задайте вопрос AI-buddy — он ответит по документам вашей команды.</p>
              <Button variant="outline" onClick={() => navigate('/')}>
                Открыть чат
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
