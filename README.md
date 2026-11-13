# AI-buddy — фронтенд-прототип Hack&Change 2026

ИИ-наставник для стажёров: вопросы по базе знаний команды, заявки на отгул и доступы,
перевод задач и следующий шаг онбординга. Прототип работает на mock-бэкенде, контракт
зафиксирован в `api/openapi.yaml`.

Все сотрудники, команды, документы и заявки **синтетические**. Реальных персональных данных нет.

## Быстрый старт (локально)

Требования: Node.js 22+, npm 10+.

```bash
cd web
npm ci
npm run dev:full
```

- веб: http://localhost:5173
- mock API: http://localhost:4010/api/v1
- вход: выберите любого тестового пользователя, пароль не нужен.

## Быстрый старт (Docker)

```bash
docker compose up --build
```

- веб: http://localhost:8080
- mock API: http://localhost:4010/api/v1
- порты можно изменить в `.env` (см. `.env.example`).

Nginx отдаёт SPA с fallback на `index.html`, проксирует `/api` и `/__mock`, отключает
буферизацию для SSE и держит длинный `proxy_read_timeout`.

## Тестовые пользователи

| Email | Роль | Команда | Что показывает |
|-------|------|---------|----------------|
| `intern@test.local` | Стажёр | A | основной демо-путь: онбординг, доступы, задача, отгул |
| `intern2@test.local` | Стажёр | B | изоляция базы знаний другой команды |
| `mentor@test.local` | Наставник | A | роль наставника, чек-лист выполнен |
| `lead@test.local` | Руководитель | A | роль руководителя, чек-лист выполнен |

Подробные сценарии и ключевые слова mock — `docs/frontend/mock-scenarios.md`.

## Экраны

- `/login` — выбор тестового пользователя; сессия в `sessionStorage`, guard маршрутов;
- `/` — чат: история, стриминг SSE, источники, оценки, «Повторить», карточки действий,
  панель онбординга и последние заявки;
- `/requests` — все заявки, фильтры по статусу/типу, детали и история статусов;
- `/onboarding` — полный чек-лист, прогресс, следующий шаг и «Начать»;
- `/mentor` — **P2 отключён** (`VITE_FEATURE_MENTOR_PAGE=false`): маршрут не регистрируется,
  в навигации отсутствует, контракт не определён. Перенесён в backlog.

Интерфейс рассчитан на десктоп от 1280px, адаптируется до 1024px (панель уходит под чат).
Контраст токенов проверяется на WCAG AA, поддерживается `prefers-reduced-motion`.

## Демо-путь

1. Войти как `intern@test.local`.
2. Нажать «Начать» у следующего шага или спросить «Как у нас устроено код-ревью?».
3. Получить ответ со статусами, источниками и бейджем «тестовый», поставить оценку.
4. Спросить «Хочу взять отгул в пятницу» → появится черновик заявки.
5. Подтвердить → появятся номер, статус и согласующий; шаг онбординга закроется.
6. Открыть `/requests` и убедиться, что заявка и история на месте.

## Контракт и mock

- `api/openapi.yaml` — REST/SSE-контракт (OpenAPI 3.0.3).
- `docs/frontend/contracts.md` — человекочитаемое описание эндпоинтов и инвариантов.
- `web/mocks/server.ts` — Express mock с реальным SSE; `web/src/mocks/handlers.ts` — MSW
  для unit/component-тестов.
- Инварианты: `Idempotency-Key` — UUID для confirm, повтор возвращает тот же результат;
  `409` возвращает сохранённое действие; SSE содержит ровно один терминальный `done`/`error`;
  `client_message_id` дедуплицирует повторную отправку.
- Запись в корпоративный сервис выполняется только после подтверждения пользователем.

## Проверки

```bash
cd web
npm run lint
npm run typecheck
npm run test:coverage   # пороги 80/80/80, ветви 65
npm run build
npm run e2e             # Playwright: mock + Vite, без внешней сети
npm run check:contrast
```

Последний прогон: 92 unit/integration-теста, 18 E2E, покрытие 84.19% строк.
Отчёт: `docs/coverage/coverage-summary.json`, описание — `docs/frontend/testing.md`.

## Структура

```text
api/openapi.yaml              контракт
docs/frontend/                требования, контракты, сценарии mock, дизайн, handoff
web/src/app/                  роутер, провайдеры
web/src/features/             auth, chat, actions, onboarding
web/src/pages/                login, chat, requests, onboarding, 404
web/src/shared/               api-клиент, схемы, компоненты, стили
web/mocks/                    Express mock API
web/e2e/                      Playwright-сценарии
```

## Документация

- `PLAN.md` — этапы, гейты, решения;
- `NOTEBOOK.md` — журнал работ, проблемы и решения;
- `docs/frontend/requirements-matrix.md` — матрица FR/NFR;
- `docs/frontend/contracts.md` — REST/SSE-контракт;
- `docs/frontend/mock-scenarios.md` — сценарии и ключевые слова mock;
- `docs/frontend/design-notes.md` — дизайн-токены и доступность;
- `docs/frontend/backend-handoff.md` — передача контракта бэкенду;
- `docs/frontend/testing.md` — стратегия тестирования.

## Ограничения прототипа

- Токен хранится в `sessionStorage`; в production нужен httpOnly-cookie и CSRF-защита.
- История чата не привязывает карточку действия к сообщению; все действия видны на `/requests`.
- Пагинация списков не реализована — контракт отдаёт простой `items`.
- `/mentor` и тёмная тема — backlog.
