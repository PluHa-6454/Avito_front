# Тестирование фронтенда

Фронтенд проверяется на трёх уровнях без зависимости от реальной сети и бэкенда.

## Команды

```bash
cd web
npm run lint          # oxlint
npm run typecheck     # tsc -b
npm run test          # Vitest + RTL + MSW
npm run test:coverage # покрытие v8 + пороги
npm run build         # typecheck + production build
npm run e2e           # Playwright: mock API + Vite
npm run check:contrast # WCAG AA для токенов
```

## Уровни

| Уровень | Инструмент | Что покрывает |
|---------|------------|---------------|
| Контракт | Vitest + Zod | схемы REST/SSE, парсер SSE, API-клиент, маппинг ошибок |
| Компоненты | RTL + MSW | чат, стриминг, источники, оценки, карточки действий, состояния |
| Интеграция | RTL + App + MSW | auth guard, маршрутизация, вход/выход, 401, онбординг, заявки |
| E2E | Playwright (chromium) | полный пользовательский путь на Express mock с реальным SSE |

## Покрытие

- Порог в `vitest.config.ts`: 80% statements/lines/functions, 65% branches.
- Текущий отчёт: `docs/coverage/coverage-summary.json`.
- Последний прогон: 92 теста в 18 файлах, 84.19% строк и statements, 71.26% ветвей.
- Исключены из покрытия: `src/main.tsx`, `src/components/ui/**`, тестовые утилиты и типы.

## E2E-сценарии

- `/login` → вход тестовым пользователем;
- `/` → вопрос по базе знаний → ответ с источниками «тестовый» → оценка;
- отгул → черновик → подтверждение → номер/статус → `/requests`;
- двойной клик по «Подтвердить» → один HTTP-запрос;
- ошибка LLM → понятный текст и «Повторить»;
- навигация во время медленного стрима → интерфейс не блокируется, стрим продолжается;
- `intern2@` → источники только команды B;
- `/requests` → фильтры и детали с историей;
- `/onboarding` → чек-лист и переход в чат с prefill;
- viewport 1024 / 1280 / 1440 → нет горизонтального скролла, панель видна.

## Изоляция и стабильность

- MSW сбрасывает handlers и mock-store после каждого unit-теста.
- E2E запускает Express mock (`:4010`) и Vite (`:5173`) через `playwright.config.ts`.
- SSE в MSW отдаётся без задержек; «медленные» сценарии эмулируются управляемым
  `ReadableStream` или проверяются в E2E на Express.
- Для E2E с общим mock-состоянием локаторы скоупятся карточкой/списком, чтобы не зависеть
  от накопленных сообщений между прогонами.
- `configure({ asyncUtilTimeout: 3000 })` в `src/test/setup.ts` снижает флаки при холодном
  импорте ленивых маршрутов.

## CI

`.github/workflows/ci.yml` выполняет: `npm ci`, lint, typecheck, `test:coverage`, build,
установку chromium и `e2e`; артефакты `coverage` и `playwright-report` сохраняются.
