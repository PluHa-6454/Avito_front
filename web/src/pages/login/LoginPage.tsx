import { FlaskConical, Loader2, LogIn, MessageSquareText, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/features/auth/auth-store'
import { TEST_USER_OPTIONS, type TestUserOption } from '@/features/auth/test-users'
import { getErrorHint, getUserMessage, isApiError } from '@/shared/api/errors'
import { RoleChip } from '@/shared/components/RoleChip'
import { SyntheticBadge } from '@/shared/components/SyntheticBadge'

type LocationState = {
  returnTo?: string
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const status = useAuthStore((state) => state.status)
  const error = useAuthStore((state) => state.error)
  const login = useAuthStore((state) => state.login)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)

  const returnTo = (location.state as LocationState | null)?.returnTo ?? '/'

  if (status === 'authenticated') {
    return <Navigate to={returnTo} replace />
  }

  const isBusy = status === 'loading'

  async function handleSelect(user: TestUserOption) {
    if (isBusy) {
      return
    }

    setPendingEmail(user.email)

    try {
      await login(user.email)
      navigate(returnTo, { replace: true })
    } catch {
      setPendingEmail(null)
    }
  }

  return (
    <main className="grid min-h-svh bg-background lg:grid-cols-[minmax(0,1fr)_520px]">
      <section className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-white/15">
            <MessageSquareText className="size-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold">AI-buddy</p>
            <p className="text-xs text-primary-foreground/70">ИИ-наставник для стажёров</p>
          </div>
        </div>

        <div className="max-w-lg">
          <h1 className="text-4xl font-semibold tracking-tight">
            Один вход для вопросов, доступов и первых задач
          </h1>
          <p className="mt-4 text-base leading-relaxed text-primary-foreground/80">
            Задавайте рабочие вопросы по базе знаний команды, оформляйте отгул и доступы, следите
            за этапами адаптации — без переключения между корпоративными сервисами.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-primary-foreground/85">
            <li className="flex items-center gap-3">
              <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
              Ответы только по документам вашей команды
            </li>
            <li className="flex items-center gap-3">
              <LogIn className="size-4 shrink-0" aria-hidden="true" />
              Запись — только после подтверждения
            </li>
          </ul>
        </div>

        <p className="text-xs text-primary-foreground/60">
          Демо-данные. Не является регламентом Авито.
        </p>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-10">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mb-2 flex items-center gap-2">
              <SyntheticBadge />
              <span className="text-[11px] text-muted-foreground">Пароль не нужен</span>
            </div>
            <CardTitle className="text-xl">Вход в AI-buddy</CardTitle>
            <CardDescription>
              Выберите тестового пользователя. Каждый профиль показывает свою роль, команду и
              набор доступных сценариев.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-2" aria-label="Тестовые пользователи">
              {TEST_USER_OPTIONS.map((user) => {
                const isPending = pendingEmail === user.email

                return (
                  <li key={user.email}>
                    <button
                      type="button"
                      onClick={() => void handleSelect(user)}
                      disabled={isBusy}
                      aria-busy={isPending}
                      className="group flex w-full items-start gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {getInitials(user.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{user.name}</span>
                          <RoleChip role={user.role} teamName={user.teamName} />
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                          {user.description}
                        </span>
                      </span>
                      {isPending ? (
                        <Loader2
                          className="mt-1 size-4 shrink-0 animate-spin text-primary"
                          aria-label="Вход выполняется"
                        />
                      ) : (
                        <LogIn
                          className="mt-1 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>

            {error ? (
              <div
                role="alert"
                className="rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-sm"
              >
                <p className="font-medium text-destructive">{getUserMessage(error)}</p>
                {getErrorHint(error) ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">{getErrorHint(error)}</p>
                ) : null}
                {isApiError(error) && error.requestId ? (
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                    request_id: {error.requestId}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="flex items-start gap-2 rounded-xl bg-muted/40 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
              <FlaskConical className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <p>
                Прототип работает на mock-бэкенде. Все сотрудники, команды и инструкции
                синтетические, реальные персональные данные не используются.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
