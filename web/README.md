# AI-buddy — веб-клиент

Фронтенд прототипа AI-buddy для Hack&Change 2026. Все данные синтетические.

## Стек

React 19, TypeScript 7, Vite 8, Tailwind CSS 4, shadcn/ui, TanStack Query, Zustand, Zod,
React Router. Тесты: Vitest + RTL + MSW, Playwright.

## Запуск

```bash
npm install
npm run dev:full
```

- веб: http://localhost:5173
- mock API: http://localhost:4010/api/v1
- Vite проксирует `/api` и `/__mock` на mock-сервер.

Только фронт: `npm run dev` (нужен запущенный mock для запросов).
Только mock: `npm run mock`.

### Docker

Из корня репозитория:

```bash
docker compose up --build
```

- веб: http://localhost:8080
- mock API: http://localhost:4010/api/v1

Nginx проксирует `/api` и `/__mock`, отключает буферизацию для SSE.

## Скрипты

| Команда | Назначение |
|---------|------------|
| `npm run dev` | Vite dev server |
| `npm run mock` | Express mock API с SSE |
| `npm run mock:start` | mock без watch (Docker) |
| `npm run dev:full` | mock + Vite одновременно |
| `npm run build` | typecheck + production build |
| `npm run typecheck` | `tsc -b` |
| `npm run lint` | oxlint |
| `npm run test` | Vitest (один прогон) |
| `npm run test:watch` | Vitest watch |
| `npm run test:coverage` | покрытие v8 |
| `npm run e2e` | Playwright |
| `npm run format` | Prettier |

## Тестовые пользователи

`intern@test.local`, `intern2@test.local`, `mentor@test.local`, `lead@test.local`.
Пароль не нужен. Подробности — `docs/frontend/mock-scenarios.md`.

## Экраны

- `/login` — выбор тестового пользователя, сессия в `sessionStorage`;
- `/` — чат, стриминг, источники, оценки, карточки действий и панель онбординга;
- `/requests` — все заявки, фильтры по статусу/типу, детали и история;
- `/onboarding` — полный чек-лист этапов, прогресс, следующий шаг и «Начать»;
- `/mentor` — P2, **отключён**: `VITE_FEATURE_MENTOR_PAGE=false`, маршрут не регистрируется,
  в навигации отсутствует. Контракт не определён; перенесён в backlog.

## Переменные окружения

См. `.env.example`:

- `VITE_API_BASE_URL` — по умолчанию `/api/v1`;
- `VITE_USE_MOCKS` — зарезервировано;
- `VITE_FEATURE_MENTOR_PAGE` — по умолчанию `false`, `/mentor` не регистрируется.

## Документация

- `../PLAN.md` — план этапов и гейты;
- `../NOTEBOOK.md` — журнал работ и решений;
- `../docs/frontend/contracts.md` — REST/SSE-контракт;
- `../docs/frontend/mock-scenarios.md` — сценарии mock;
- `../docs/frontend/requirements-matrix.md` — требования FR/NFR;
- `../api/openapi.yaml` — OpenAPI 3.0.3.
