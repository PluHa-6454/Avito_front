# Mock-сценарии AI-buddy

Статус: **этап 2**. Mock-сервер — эталон поведения до появления бэкенда.
Запуск: `npm run mock` (порт `4010`) или `npm run dev:full` (mock + Vite).
Сброс данных: `POST /__mock/reset`. Принудительный сценарий: `POST /__mock/config`.

## Тестовые пользователи

| Email | Роль | Команда | onboarding |
|-------|------|---------|------------|
| `intern@test.local` | intern | Команда A | 2 из 6 шагов |
| `intern2@test.local` | intern | Команда B | 2 из 6 шагов |
| `mentor@test.local` | mentor | Команда A | всё выполнено |
| `lead@test.local` | lead | Команда A | всё выполнено |

Пароль не нужен. Токен — `mock.<user_id>`, например `mock.u_intern_a`.

## Определение сценария

Сценарий выбирается по ключевым словам в тексте сообщения. Переопределение:

```bash
curl -X POST http://localhost:4010/__mock/config \
  -H 'Content-Type: application/json' \
  -d '{"scenario":"slow","latencyMs":0}'
```

`scenario: null` возвращает автоопределение. `latencyMs` добавляется к задержке каждого шага
(используется в E2E для проверки отзывчивости интерфейса).

## Сценарии

| Сценарий | Триггеры | Что отдаёт mock | Проверяет фронт |
|----------|----------|-----------------|-----------------|
| `kb` | ревью, процесс, команда, онбординг; по умолчанию | `status`, `sources`, `token`, `done` | базовый ответ, источники, бейдж «тестовый» |
| `absence` | отгул, отпуск, выходной | `action_draft` типа `absence.create` | карточка черновика, confirm |
| `access` | доступ, gitlab, wiki, трекер | `action_draft` типа `access.request` | черновик доступа, confirm |
| `task` | задача, тикет, task | `action_draft` типа `tasks.transition` | перевод задачи, confirm |
| `refusal` | наставник, не знаю, непонятно | отказ + `action_draft` `mentor.ask` | отказ без выдуманного ответа |
| `llm_error` | ошибка, сбой, недоступ | `status`, затем терминальный `error` | состояние ошибки и «Повторить» |
| `slow` | медленно, подробно | длинный поток токенов с задержкой 120 мс | навигация во время стрима |
| `disconnect` | обрыв, разрыв | `token`, затем закрытие без терминального события | ошибка соединения, «Повторить» без дубля |
| `rate_limit` | лимит, rate | HTTP `429` + `Retry-After: 30` | таймер повторения |
| `forbidden` | нельзя, запрет, чуж | HTTP `403` | «нет доступа» + подсказка |

## SSE-контракт

```
event: status
data: {"stage":"kb_search","text":"ищу в базе знаний"}

event: sources
data: {"items":[{"doc_id":"kb-001","title":"Код-ревью в команде A","synthetic":true}]}

event: token
data: {"text":"Код-ревью проходит в два этапа."}

event: action_draft
data: {"action_id":"act_101","type":"absence.create","fields":{"date":"2026-11-20"}}

event: done
data: {"message_id":"msg_102"}
```

Инварианты: ровно одно терминальное событие (`done` или `error`); после терминального клиент
игнорирует остальные; обрыв без терминального — ошибка соединения.

## Подтверждение действия

```bash
curl -X POST http://localhost:4010/api/v1/actions/act_101/confirm \
  -H "Authorization: Bearer mock.u_intern_a" \
  -H "Idempotency-Key: 6f1c2d9e-4a7b-4c1d-9e2f-0a1b2c3d4e5f"
```

- Первый вызов: `200 {action}` со статусом `done` и результатом.
- Повтор с тем же ключом: тот же результат, без второго выполнения.
- Другой ключ: `409 CONFLICT` + сохранённый `action`.
- Чужое действие: `403`.
- Отмена: `POST /api/v1/actions/{id}/cancel`; повторная отмена идемпотентна.

## Автозакрытие онбординга

| Действие | Шаг |
|----------|-----|
| `access.request` | «Получить доступы» |
| `tasks.transition` → `in_progress` | «Взять первую задачу» |
| `absence.create` | «Оформить отгул» |

После успешного confirm шаг становится `done`, `progress` пересчитывается.
`GET /api/v1/onboarding` возвращает новый `next_step`.

## MSW

Для юнит/компонентных тестов те же сценарии доступны через `src/mocks/handlers.ts`.
Состояние сбрасывается в `afterEach` через `mockStore.reset()`.
SSE в MSW отдаётся одним потоком без задержек; задержки проверяются в E2E на Express-сервере.
