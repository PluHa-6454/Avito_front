import { expect, test } from '@playwright/test'

import { loginAsIntern } from './helpers'

test.describe('страницы заявок и онбординга', () => {
  test('заявки: список, фильтр и детали', async ({ page }) => {
    await loginAsIntern(page)

    await page.getByRole('link', { name: 'Заявки' }).click()
    await expect(page.getByRole('heading', { name: 'Мои заявки' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Заявка на отгул' }).first()).toBeVisible()

    await page.getByRole('button', { name: 'Отменено' }).click()
    await expect(page.getByRole('heading', { name: 'Запрос доступа' }).first()).toBeVisible()

    await page.getByRole('button', { name: 'Все' }).click()
    await page.getByRole('button', { name: 'Подробнее' }).first().click()

    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('История')).toBeVisible()
    await expect(dialog.getByText('Параметры')).toBeVisible()
  })

  test('онбординг: чек-лист и переход в чат с запросом', async ({ page }) => {
    await loginAsIntern(page)

    await page.getByRole('link', { name: 'Онбординг' }).click()
    await expect(page.getByRole('heading', { name: 'Онбординг' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('progressbar', { name: 'Прогресс онбординга' })).toBeVisible()
    await expect(page.getByText('Первый месяц')).toBeVisible()

    await page.getByRole('button', { name: 'Начать' }).click()

    await expect(page.getByRole('heading', { name: 'Чат с наставником' })).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Сообщение' })).toHaveValue(/./)
  })
})
