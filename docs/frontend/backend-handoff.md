# Передача контракта бэкенду

Фронтенд-прототип реализован contract-first: `api/openapi.yaml` и Zod-схемы в
`web/src/shared/api/schemas` — источник истины. Express mock (`web/mocks/server.ts`) —
эталон поведения до появления реального бэкенда.

## Базовые правила

- База: `/api/v1`, JSON, авторизация `Authorization: Bearer <token>`.
- Ошибки: `{ "error": { "code", "message", "hint?", "request_id" } }`.
- `request_id` показывается пользователю в деталях ошибки.
- Даты — ISO 8601 (`2026-11-13T10:00:00.000Z`).
- Списки — `{ "items": [...] }` без пагинации (для прототипа).
- 401 → клиент сбрасывает сессию и показывает «Сессия истекла»; 403 → нет прав + подсказка.

## REST

| Метод | Путь | Назначение |
|-------|------|------------|
| POST | `/auth/login` | вход по `{ email }`, возвращает `{ token, user }` |
| GET | `/me` | профиль текущего пользователя |
| GET | `/conversations` | диалоги пользователя |
| POST | `/conversations` | создать диалог (`{ title? }`) |
| GET | `/conversations/{id}/messages` | история сообщений |
| POST | `/conversations/{id}/messages` | отправить сообщение, ответ — SSE |
| POST | `/messages/{id}/feedback` | оценка `{ rating: up\|down, comment? }` |
| GET | `/actions` | действия пользователя |
| GET | `/actions/{id}` | действие с историей |
| POST | `/actions/{id}/confirm` | подтвердить, требуется `Idempotency-Key` |
| POST | `/actions/{id}/cancel` | отменить черновик |
| GET | `/onboarding` | этапы, шаги, прогресс, следующий шаг |
| GET | `/healthz` | healthcheck mock |

### Отправка сообщения

```json
{
  "text": "Хочу взять отгул в пятницу",
  "client_message_id": "7d0e3f6e-2c1b-4a59-9e6f-2f1a4b8c9d01"
}
```

- `client_message_id` обязателен и обеспечивает дедупликацию повторов.
- Ответ: `Content-Type: text/event-stream`.
- Повторная отправка с тем же `client_message_id` не создаёт второе сообщение.

### Подтверждение действия

```http
POST /api/v1/actions/act_01/confirm
Idempotency-Key: 0f7f4a5e-4c2b-4f7e-9f3a-2b1c6d8e9a01
```

- Ключ обязан быть UUID.
- Повтор с тем же ключом возвращает тот же результат.
- Если действие уже выполнено: `409` и тело
  `{ "error": {...}, "action": { ...сохранённое действие... } }`.
- Фронтенд при `409` показывает сохранённый результат, а не ошибку.
- Фронтенд блокирует кнопку и повторно использует ключ при сетевом ретрае.

## SSE

События: `status`, `token`, `sources`, `action_draft`, `action_result`, `error`, `done`.
Формат: `event: <name>` + `data: <json>` + пустая строка.

| Событие | data |
|---------|------|
| `status` | `{ "stage": "kb_search", "text": "ищу в базе знаний" }` |
| `token` | `{ "text": "фрагмент" }` |
| `sources` | `{ "items": [{ "doc_id", "title", "synthetic" }] }` |
| `action_draft` | `{ "action_id", "type", "fields" }` |
| `action_result` | `{ "action_id", "status", "result" }` |
| `error` | `{ "code", "message" }` |
| `done` | `{ "message_id" }` |

Инварианты:

1. Ровно один терминальный event: `done` или `error`.
2. После терминального события поток закрывается.
3. `token` можно батчить; фронтенд копит токены 40 мс.
4. `sources` приходит до токенов или вместе с ними.
5. `action_draft` создаёт действие в статусе `draft`; запись выполняется только после confirm.
6. Отмена клиентом (abort) не должна создавать запись.

## Модель действия

`type`: `absence.create`, `access.request`, `tasks.transition`, `mentor.ask`.

`status`: `draft → confirmed → executing → done | failed`, либо `draft → cancelled`.

`history`: массив `{ status, at, note? }` — показывается в деталях на `/requests`.

`result` — типозависимый объект:

- отгул/доступ: `{ number, status, approver }`;
- задача: `{ task_id, status }`;
- вопрос наставнику: `{ request_id, status, mentor }`.

## Онбординг

```json
{
  "stages": [
    {
      "code": "day_1",
      "title": "День 1",
      "order": 1,
      "steps": [
        { "code": "meet_team", "title": "...", "status": "done", "order": 1, "action_type": null }
      ]
    }
  ],
  "next_step": { "stage_code", "step_code", "title", "prompt" },
  "progress": { "completed": 1, "total": 6, "percent": 17 }
}
```

- `next_step` — первый шаг не в статусе `done`.
- `prompt` — готовый текст для кнопки «Начать»; клиент имеет fallback по `step_code`.
- После успешного действия бэкенд закрывает соответствующий шаг; фронтенд инвалидирует
  `['onboarding']` и `['actions']` после confirm/`action_result`.

## Коды ошибок

| Код | HTTP | Когда |
|-----|------|-------|
| `VALIDATION_ERROR` | 400/422 | неверные поля, даты, лимиты |
| `UNAUTHORIZED` | 401 | нет/истёк токен |
| `FORBIDDEN` | 403 | нет прав на объект/роль |
| `NOT_FOUND` | 404 | объект не найден |
| `CONFLICT` | 409 | действие уже выполнено |
| `ACTION_NOT_ALLOWED` | 422 | недопустимый переход статуса |
| `RATE_LIMITED` | 429 | лимит LLM, `Retry-After` в секундах |
| `INTERNAL` | 500 | внутренняя ошибка |
| `LLM_UNAVAILABLE` | 503/SSE | модель недоступна |

## Поведение mock для сверки

- Ключевые слова сценариев: `ревью/команда` → kb, `отгул` → absence, `доступ` → access,
  `задач` → task, `наставник` → refusal, `сбой` → llm_error, `медленно` → slow,
  `обрыв` → disconnect, `лимит` → 429, `нельзя/чуж` → 403.
- Медленный стрим — задержки на каждый токен; disconnect рвёт поток после первого токена.
- `POST /api/v1/__mock/reset` и `/__mock/config` — только для тестов/демо.
- Подробности: `docs/frontend/mock-scenarios.md`.

## Чек-лист интеграции бэкенда

- [ ] Реализованы все пути из `api/openapi.yaml` с теми же схемами.
- [ ] `confirm` валидирует UUID `Idempotency-Key` и хранит результат повторов.
- [ ] `409` возвращает `action` в теле.
- [ ] SSE отдаёт ровно один терминальный event и закрывает поток.
- [ ] `client_message_id` дедуплицирует сообщения.
- [ ] Поля `sources[].synthetic` заполняются.
- [ ] Права проверяются до выдачи документов/действий.
- [ ] `next_step.prompt` заполняется или клиент использует fallback.
- [ ] Ошибки содержат `request_id`.
- [ ] Даты — ISO 8601.
- [ ] При записи соблюдается confirm-only.

## Открытые вопросы

1. Нужен ли `action_id` в сообщении, чтобы карточка действия восстанавливалась в истории чата?
   Сейчас действия видны на `/requests`, а карточка живёт в контексте текущего стрима.
2. Нужна ли пагинация `items` при росте истории?
3. Формат `result` для новых типов действий.
4. Контракт `/mentor` — P2, не определён; страница отключена флагом.
5. Хранение токена: прототип использует `sessionStorage`; production — httpOnly cookie + CSRF.
