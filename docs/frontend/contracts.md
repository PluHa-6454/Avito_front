# Контракт фронтенда и бэкенда (draft v0.1)

Статус: **черновик, этап 0**. Источник: ТЗ `TZ-AI-BUDDY-1.0` §10, §12; кейс Hack&Change 2026.
Бэкенда пока нет, поэтому этот документ вместе с `api/openapi.yaml` и Zod-схемами фиксирует
контракт, который фронтенд реализует в mock-слое, а бэкенд — позже.

> Правило: любое изменение контракта — отдельный PR/коммит с обновлением `api/openapi.yaml`,
> Zod-схем, mock-сервера, тестов и этого документа.

## 1. Общие правила

- Base URL: `/api/v1` (в dev — Vite proxy на mock-сервер; в prod — nginx proxy на `buddy-api`).
- Авторизация: `Authorization: Bearer <JWT>`; JWT выдаёт `corp-mock`, `buddy-api` валидирует.
- Формат: JSON UTF-8, `Content-Type: application/json`; SSE — `text/event-stream`.
- Время: ISO 8601 с таймзоной (`2026-11-13T10:00:00Z`).
- Идентификаторы: строки (ULID/UUID) — фронт не парсит формат.
- Ошибки: единый формат (см. §6).
- Все данные синтетические; документы и источники помечаются `synthetic: true`.

## 2. REST API

| Метод | Путь | Назначение | Успех | Ошибки |
|-------|------|------------|-------|--------|
| POST | `/auth/login` | Вход тестовым пользователем | `200 {token, user}` | 400, 401, 500 |
| GET | `/me` | Профиль, команда, роль, этап | `200 User` | 401 |
| GET | `/conversations` | Список диалогов | `200 {items: Conversation[]}` | 401 |
| POST | `/conversations` | Новый диалог | `201 Conversation` | 400, 401 |
| GET | `/conversations/{id}` | Диалог с метаданными | `200 Conversation` | 401, 403, 404 |
| GET | `/conversations/{id}/messages` | История сообщений | `200 {items: Message[]}` | 401, 403, 404 |
| POST | `/conversations/{id}/messages` | Отправить сообщение, ответ SSE | `200 text/event-stream` | 400, 401, 403, 404, 429, 500, 503 |
| GET | `/actions` | Заявки/действия пользователя | `200 {items: Action[]}` | 401 |
| GET | `/actions/{id}` | Статус, результат, история | `200 Action` | 401, 403, 404 |
| POST | `/actions/{id}/confirm` | Подтвердить действие | `200 {action: Action}` | 400, 401, 403, 404, 409, 422, 429, 500, 503 |
| POST | `/actions/{id}/cancel` | Отменить черновик | `200 {action: Action}` | 401, 403, 404, 409, 422 |
| GET | `/onboarding` | Этапы, шаги, статусы, следующий шаг | `200 Onboarding` | 401 |
| POST | `/messages/{id}/feedback` | Оценка ответа | `200 {feedback: Feedback}` | 400, 401, 403, 404 |
| GET | `/healthz` | Healthcheck | `200 text/plain` | — |
| GET | `/metrics` | Prometheus | `200 text/plain` | — |

### 2.1. `POST /auth/login`

```json
{ "email": "intern@test.local" }
```

```json
{
  "token": "synthetic.jwt.token",
  "user": {
    "id": "u_intern_a",
    "email": "intern@test.local",
    "name": "Анна Стажёрова",
    "role": "intern",
    "team_id": "team_a",
    "team_name": "Команда A",
    "onboarding_stage": "week_1"
  }
}
```

Тестовые пользователи: `intern@test.local` (стажёр, A), `intern2@test.local` (стажёр, B),
`mentor@test.local` (наставник, A), `lead@test.local` (руководитель, A). Пароль не нужен — прототип.

### 2.2. `GET /me`

Возвращает `User`. Если токен истёк — `401 UNAUTHORIZED`.

### 2.3. Диалоги

`Conversation`:

```json
{
  "id": "conv_01",
  "title": "Вопросы по команде",
  "created_at": "2026-11-13T09:00:00Z",
  "updated_at": "2026-11-13T09:05:00Z"
}
```

`POST /conversations` принимает `{ "title": "Новый диалог" }` (необязательно). Если title нет,
бэкенд может подставить «Новый диалог».

### 2.4. Сообщения

`Message`:

```json
{
  "id": "msg_01",
  "conversation_id": "conv_01",
  "role": "assistant",
  "text": "Код-ревью проходит в два этапа…",
  "status": "done",
  "sources": [
    { "doc_id": "kb-014", "title": "Код-ревью в команде A", "synthetic": true }
  ],
  "created_at": "2026-11-13T09:01:00Z",
  "feedback": { "rating": "up", "comment": null }
}
```

`role`: `user | assistant`. `status`: `streaming | done | error` (для истории достаточно `done`).

`POST /conversations/{id}/messages`:

```json
{
  "text": "Как у нас устроено код-ревью?",
  "client_message_id": "6f1c2d9e-4a7b-4c1d-9e2f-0a1b2c3d4e5f"
}
```

`client_message_id` — **contract proposal** для идемпотентности: повторный POST с тем же
`client_message_id` не создаёт второе сообщение, а продолжает/возвращает ответ. Нужен для
кнопки «Повторить» после обрыва SSE.

Ответ — поток SSE (см. §5).

### 2.5. Действия

`Action`:

```json
{
  "id": "act_01",
  "type": "absence.create",
  "status": "draft",
  "fields": {
    "date": "2026-11-20",
    "reason": "Личные дела"
  },
  "result": null,
  "error": null,
  "created_at": "2026-11-13T09:02:00Z",
  "updated_at": "2026-11-13T09:02:00Z",
  "history": [
    { "status": "draft", "at": "2026-11-13T09:02:00Z", "note": "Черновик создан агентом" }
  ]
}
```

- `type`: `absence.create | access.request | tasks.transition | mentor.ask`.
- `status`: `draft | confirmed | executing | done | failed | cancelled`.
- `fields` — типозависимый объект; фронт отображает известные поля и не валидирует бизнес-правила.
- `result` — результат корпоративного сервиса: `{ "number": "ABS-1024", "status": "pending",
  "approver": "Мария Петрова" }`; для задачи — `{ "task_id": "TASK-7", "status": "in_progress" }`.
- `history` — **contract proposal**: нужна для `/requests`; если бэкенд не отдаёт, фронт показывает
  текущий статус и даты.

`POST /actions/{id}/confirm`:

- Header: `Idempotency-Key: <UUID>` (обязателен).
- Тело: пустое или `{}`.
- Успех: `200 { "action": Action }` со статусом `done`/`failed`.
- Повтор с тем же ключом: тот же результат, без вызова корпоративного сервиса.
- Другой ключ для уже выполненного действия: `409 CONFLICT` + сохранённый результат.
- `422 ACTION_NOT_ALLOWED` — запрещённый переход/неположенный доступ.
- `429 RATE_LIMITED` — лимит; `Retry-After` желателен.

`POST /actions/{id}/cancel`: `200 { "action": Action }` со статусом `cancelled`; повторный cancel
идемпотентен (возвращает `cancelled`), выполненное действие отменить нельзя (`409`/`422`).

### 2.6. Онбординг

```json
{
  "stages": [
    {
      "code": "day_1",
      "title": "День 1",
      "order": 1,
      "steps": [
        {
          "code": "meet_team",
          "title": "Познакомиться с командой",
          "description": "Состав команды и наставник",
          "status": "done",
          "order": 1,
          "action_type": null
        },
        {
          "code": "get_access",
          "title": "Получить доступы",
          "status": "in_progress",
          "order": 2,
          "action_type": "access.request"
        }
      ]
    }
  ],
  "next_step": {
    "stage_code": "day_1",
    "step_code": "get_access",
    "title": "Получить доступы",
    "prompt": "Какие доступы мне нужны?"
  },
  "progress": { "completed": 1, "total": 6, "percent": 17 }
}
```

`status`: `done | in_progress | pending`. `next_step` может быть `null`, если всё выполнено.
`prompt` — необязательный текст для кнопки «Начать»; фронт имеет fallback по `step_code`.

Маппинг автозакрытия (бэкенд): `absence.create → step «Оформить отгул»`,
`access.request → step «Получить доступы»`, `tasks.transition в in_progress → step «Взять первую задачу»`.

### 2.7. Оценка ответа

```json
{ "rating": "down", "comment": "Не хватило ссылки на инструкцию" }
```

`rating`: `up | down`; `comment` — необязательный, до 1000 символов. Ответ:
`{ "feedback": { "id": "fb_01", "message_id": "msg_01", "rating": "down", "comment": "...", "created_at": "..." } }`.
Повторная оценка обновляет существующую (upsert).

## 3. Модель пользователя

```json
{
  "id": "u_intern_a",
  "email": "intern@test.local",
  "name": "Анна Стажёрова",
  "role": "intern",
  "team_id": "team_a",
  "team_name": "Команда A",
  "onboarding_stage": "week_1"
}
```

`role`: `intern | mentor | lead`. Права проверяет бэкенд; фронт показывает роль/команду и
обрабатывает `403`.

## 4. Ошибки

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "У вас нет доступа к этому действию",
    "hint": "Обратитесь к наставнику @mentor",
    "request_id": "req_01J..."
  }
}
```

| HTTP | code | Когда | UI |
|------|------|-------|-----|
| 400 | `VALIDATION_ERROR` | Некорректные данные | «Проверьте данные» + hint |
| 401 | `UNAUTHORIZED` | Нет/истёк токен | выход, `/login`, «Сессия истекла» |
| 403 | `FORBIDDEN` | Нет прав | «У вас нет доступа» + hint |
| 404 | `NOT_FOUND` | Объект не найден/недоступен | «Не найдено» + hint |
| 409 | `CONFLICT` | Действие уже выполнено | показать сохранённый результат |
| 422 | `ACTION_NOT_ALLOWED` | Неположенный доступ/переход | объяснение, без retry |
| 429 | `RATE_LIMITED` | Лимит LLM | таймер, повтор позже |
| 500 | `INTERNAL` | Внутренняя ошибка | «Что-то пошло не так» + request_id |
| 503 | `LLM_UNAVAILABLE` | LLM недоступна | «AI временно недоступен» + retry |

Для `409` тело может содержать `action` рядом с `error`:

```json
{
  "error": { "code": "CONFLICT", "message": "Действие уже выполнено", "hint": "...", "request_id": "req_..." },
  "action": { "id": "act_01", "status": "done", "result": { "number": "ABS-1024" } }
}
```

Если `action` нет — фронт делает `GET /actions/{id}` и показывает результат.

## 5. SSE

`POST /conversations/{id}/messages` отвечает `200 text/event-stream`:

```
event: status
data: {"stage":"kb_search","text":"ищу в базе знаний"}

event: sources
data: {"items":[{"doc_id":"kb-014","title":"Код-ревью в команде A","synthetic":true}]}

event: token
data: {"text":"Код-ревью проходит в два этапа: "}

event: action_draft
data: {"action_id":"act_01","type":"absence.create","fields":{"date":"2026-11-20"}}

event: action_result
data: {"action_id":"act_01","status":"done","result":{"number":"ABS-1024","status":"pending","approver":"Мария Петрова"}}

event: error
data: {"code":"LLM_UNAVAILABLE","message":"LLM недоступна"}

event: done
data: {"message_id":"msg_01"}
```

### События

| event | payload | Когда |
|-------|---------|-------|
| `status` | `{stage, text}` | перед шагом агента |
| `token` | `{text}` | по мере генерации |
| `sources` | `{items: Source[]}` | после поиска, до финального текста |
| `action_draft` | `{action_id, type, fields}` | агент подготовил черновик |
| `action_result` | `{action_id, status, result}` | после подтверждения/выполнения (если бэкенд стримит) |
| `error` | `{code, message}` | сбой; терминальное |
| `done` | `{message_id}` | успешное завершение; терминальное |

### Инварианты

1. Ровно одно терминальное событие: `done` или `error`.
2. После терминального события клиент игнорирует всё остальное.
3. События не дублируются; повторный терминальный игнорируется.
4. При обрыве без терминального — ошибка соединения и «Повторить» без второго сообщения.
5. Неизвестные события и поля игнорируются (forward compatibility).
6. `data` может быть многострочным; парсер склеивает строки через `\n`.
7. Комментарии (`: keep-alive`) игнорируются.

### Транспорт `action_result`

Основной канал результата подтверждения — ответ `POST /actions/{id}/confirm`. Событие
`action_result` в SSE поддерживается на случай, если бэкенд решит стримить результат в открытом
потоке. Фронт обрабатывает оба идемпотентно (обновление карточки по `action_id`).

## 6. Идемпотентность

- Confirm: `Idempotency-Key` (UUID) обязателен; сервер хранит `(action_id, key)` с уникальным индексом.
- Повтор с тем же ключом → сохранённый результат, без вызова корпоративного сервиса.
- Другой ключ для выполненного действия → `409 CONFLICT` + результат.
- Отправка сообщения: `client_message_id` (UUID) в теле — contract proposal; повтор не создаёт дубль.
- Фронт генерирует ключ один раз на попытку и переиспользует при ретраях.

## 7. Права (ожидаемое поведение бэкенда)

| Действие | intern A | intern B | mentor | lead |
|----------|----------|----------|--------|------|
| Вход, чат, свои диалоги | ✓ | ✓ | ✓ | ✓ |
| KB команды A | ✓ | — | ✓ | ✓ |
| KB команды B | — | ✓ | — | — |
| `absence.create`, `absence.list_my` | ✓ | ✓ | ✓ | ✓ |
| `access.list_required`, `access.list_my` | ✓ | ✓ | ✓ | ✓ |
| `access.request` на положенный доступ | ✓ | ✓ | ✓ | ✓ |
| `access.request` на неположенный | — | — | — | — |
| `tasks.list_my`, `tasks.get` | ✓ | ✓ | ✓ | ✓ |
| `tasks.transition` по своей задаче | ✓ | ✓ | — | ✓ |
| `mentor.ask` | ✓ | ✓ | — | — |
| `/requests` | свои | свои | свои | свои |
| Согласование в corp-mock | — | — | — | ✓ |

Фронт не заменяет серверную проверку прав: он отображает роль/команду и обрабатывает `403`.

## 8. Contract proposals (требуют согласования с бэкендом)

1. `client_message_id` в `POST /conversations/{id}/messages` для идемпотентности и retry.
2. `POST /actions/{id}/confirm` → `{action}`; `action_result` в SSE — опционально.
3. `409` с `action` в теле; fallback `GET /actions/{id}`.
4. `Action.history` в `GET /actions/{id}` для `/requests`.
5. `POST /auth/login {email}` без пароля для тестовых пользователей.
6. `next_step.prompt` в `/onboarding` для кнопки «Начать» (fallback на фронте).
7. `/mentor` — контракт не определён; P2 off, backlog.

## 9. Mock-поведение

Mock-сервер (`web/mocks/server.ts`) реализует этот контракт в памяти:

- 4 пользователя, команды A/B, KB-документы с `synthetic: true`.
- Диалоги, сообщения, действия, онбординг, feedback.
- SSE-сценарии: KB-ответ, отгул, доступы, задача, отказ, ошибка LLM, медленный стрим, обрыв.
- Confirm: идемпотентность по ключу; повтор с другим ключом → 409 с результатом.
- `POST /__mock/reset` и `POST /__mock/config` — только для тестов/E2E, не часть продуктового API.
- Данные сбрасываются в исходное состояние перед каждым E2E-тестом.

## 10. Управление контрактом

- Источник истины: `api/openapi.yaml` + Zod-схемы `web/src/shared/api/schemas`.
- Изменение: обновить OpenAPI, Zod, mock, тесты, этот документ; отдельный коммит/PR.
- После появления бэкенда: contract tests (Zod-валидация реальных ответов) + E2E против реального API.
- До появления бэкенда: mock-сервер — эталон поведения; фронт не ходит в corp-mock напрямую.
