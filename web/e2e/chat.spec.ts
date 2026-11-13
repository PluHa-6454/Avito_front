import { expect, test } from '@playwright/test'

import { loginAs, loginAsIntern } from './helpers'

test.describe('чат', () => {
  test('вопрос → ответ с источниками → оценка', async ({ page }) => {
    await loginAsIntern(page)

    await page.getByRole('textbox', { name: 'Сообщение' }).fill('Как устроено код-ревью?')
    await page.getByRole('button', { name: 'Отправить сообщение' }).click()

    await expect(page.getByText('Как устроено код-ревью?').last()).toBeVisible()
    await expect(page.getByText(/Код-ревью проходит в два этапа/).last()).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText('Код-ревью в команде A').last()).toBeVisible()
    await expect(page.getByText('тестовый').last()).toBeVisible()

    const answer = page
      .locator('article[aria-label="Ответ AI-buddy"]')
      .filter({ hasText: 'Код-ревью проходит в два этапа' })
      .last()
    const up = answer.getByRole('button', { name: 'Ответ полезен' })
    await up.click()
    await expect(
      page.getByRole('button', { name: 'Ответ полезен', pressed: true }).first(),
    ).toBeVisible()
  })

  test('стрим не блокирует навигацию', async ({ page }) => {
    await loginAsIntern(page)

    await page.getByRole('textbox', { name: 'Сообщение' }).fill('Расскажи медленно и подробно')
    await page.getByRole('button', { name: 'Отправить сообщение' }).click()

    await expect(page.getByRole('button', { name: 'Остановить' })).toBeVisible()

    await page.getByRole('link', { name: 'Заявки' }).click()
    await expect(page.getByRole('heading', { name: 'Мои заявки' })).toBeVisible()

    await page.getByRole('link', { name: 'Чат', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Остановить' })).toBeVisible()

    await page.getByRole('button', { name: 'Остановить' }).click()
    await expect(page.getByRole('button', { name: 'Остановить' })).toBeHidden()
  })

  test('ошибка LLM показывает «Повторить»', async ({ page }) => {
    await loginAsIntern(page)

    await page.getByRole('textbox', { name: 'Сообщение' }).fill('Покажи сбой')
    await page.getByRole('button', { name: 'Отправить сообщение' }).click()

    await expect(page.getByText('Не удалось получить ответ')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: 'Повторить' })).toBeVisible()
  })

  test('черновик отгула подтверждается и показывает результат', async ({ page }) => {
    await loginAsIntern(page)

    await page.getByRole('textbox', { name: 'Сообщение' }).fill('Хочу взять отгул в пятницу')
    await page.getByRole('button', { name: 'Отправить сообщение' }).click()

    await expect(
      page.getByRole('region', { name: 'Карточка действия: Заявка на отгул' }),
    ).toBeVisible({ timeout: 15_000 })

    await page.getByRole('button', { name: 'Подтвердить' }).click()

    const card = page
      .getByRole('region', { name: 'Карточка действия: Заявка на отгул' })
      .last()

    await expect(card.getByText('ABS-1024')).toBeVisible()
    await expect(card.getByText('Ожидает согласования')).toBeVisible()

    await page.getByRole('link', { name: 'Заявки' }).click()
    await expect(page.getByRole('heading', { name: 'Мои заявки' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Заявка на отгул' }).first()).toBeVisible()
  })

  test('панель онбординга подставляет запрос в чат', async ({ page }) => {
    await loginAsIntern(page)

    await expect(page.getByRole('progressbar', { name: 'Прогресс онбординга' })).toBeVisible()
    await expect(page.getByText('Следующий шаг')).toBeVisible()

    await page.getByRole('button', { name: 'Начать' }).click()

    await expect(page.getByRole('textbox', { name: 'Сообщение' })).toHaveValue(/./)
  })

  test('двойной клик по «Подтвердить» отправляет один запрос', async ({ page }) => {
    let confirmRequests = 0

    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().includes('/confirm')) {
        confirmRequests += 1
      }
    })

    await loginAsIntern(page)

    await page.getByRole('textbox', { name: 'Сообщение' }).fill('Хочу взять отгул на пятницу')
    await page.getByRole('button', { name: 'Отправить сообщение' }).click()

    const card = page
      .getByRole('region', { name: 'Карточка действия: Заявка на отгул' })
      .last()

    await expect(card).toBeVisible({ timeout: 15_000 })
    await card.getByRole('button', { name: 'Подтвердить' }).dblclick()

    await expect(card.getByText('ABS-1024')).toBeVisible()
    expect(confirmRequests).toBe(1)
  })

  test('intern2 видит только документы своей команды', async ({ page }) => {
    await loginAs(page, 'Борис Новиков')

    await page.getByRole('textbox', { name: 'Сообщение' }).fill('Как устроено код-ревью?')
    await page.getByRole('button', { name: 'Отправить сообщение' }).click()

    await expect(page.getByText('Код-ревью в команде B').last()).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText('Код-ревью в команде A')).toHaveCount(0)
  })
})
