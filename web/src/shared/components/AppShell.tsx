import { Bot, ClipboardList, LayoutDashboard, ListChecks, LogOut, UserRound } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/features/auth/auth-store'
import { ROLE_LABELS } from '@/shared/lib/roles'
import { SyntheticBadge } from '@/shared/components/SyntheticBadge'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'Чат', icon: LayoutDashboard, end: true },
  { to: '/requests', label: 'Заявки', icon: ClipboardList, end: false },
  { to: '/onboarding', label: 'Онбординг', icon: ListChecks, end: false },
] as const

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function AppShell() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Перейти к содержимому
      </a>
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-3 px-4 lg:px-6">
          <NavLink to="/" className="flex shrink-0 items-center gap-2.5 rounded-lg">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Bot className="size-5" aria-hidden="true" />
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-sm font-semibold text-foreground">AI-buddy</span>
              <span className="block text-[11px] text-muted-foreground">ИИ-наставник</span>
            </span>
          </NavLink>

          <nav
            aria-label="Основная навигация"
            className="ml-1 flex min-w-0 items-center gap-1 overflow-x-auto"
          >
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )
                }
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <SyntheticBadge label="демо-данные" className="hidden md:inline-flex" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full border border-border bg-background px-1.5 py-1.5 pr-2.5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  aria-label={user ? `Профиль: ${user.name}` : 'Профиль'}
                >
                  <span className="grid size-7 place-items-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                    {user ? getInitials(user.name) : <UserRound className="size-4" />}
                  </span>
                  <span className="hidden leading-tight sm:block">
                    <span className="block max-w-[150px] truncate text-xs font-semibold text-foreground">
                      {user?.name ?? 'Пользователь'}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {user ? ROLE_LABELS[user.role] : ''}
                    </span>
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>
                  <span className="block text-sm font-semibold text-foreground">{user?.name}</span>
                  <span className="block text-xs font-normal text-muted-foreground">
                    {user?.email}
                  </span>
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                    {user ? `${ROLE_LABELS[user.role]} · ${user.team_name}` : ''}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleLogout}>
                  <LogOut className="size-4" aria-hidden="true" />
                  Выйти
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main id="main-content" className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 lg:px-6">
        <Outlet />
      </main>

      <footer className="border-t border-border/80">
        <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground lg:px-6">
          <span>AI-buddy · прототип Hack&amp;Change 2026</span>
          <span>Все сотрудники, команды и инструкции синтетические</span>
        </div>
      </footer>
    </div>
  )
}
