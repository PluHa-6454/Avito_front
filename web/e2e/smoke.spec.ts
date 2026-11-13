import { expect, test } from '@playwright/test'

import { loginAsIntern } from './helpers'

test.describe('каркас приложения', () => {
  test('страница входа открывается', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByText('Вход в AI-buddy')).toBeVisible()
    await expect(page).toHaveTitle(/AI-buddy/)
  })

  test('навигация ведёт в чат, заявки и онбординг', async ({ page }) => {
    await loginAsIntern(page)

    await page.getByRole('link', { name: 'Заявки' }).click()
    await expect(page.getByRole('heading', { name: 'Мои заявки' })).toBeVisible()

    await page.getByRole('link', { name: 'Онбординг' }).click()
    await expect(page.getByRole('heading', { name: 'Онбординг' })).toBeVisible()
  })

  test('неизвестный маршрут показывает 404', async ({ page }) => {
    await page.goto('/unknown-route')

    await expect(page.getByRole('heading', { name: 'Страница не найдена' })).toBeVisible()
  })

  test('неавторизованный пользователь попадает на вход', async ({ page }) => {
    await page.goto('/requests')

    await expect(page.getByText('Вход в AI-buddy')).toBeVisible()
  })

  test('выход возвращает на страницу входа', async ({ page }) => {
    await loginAsIntern(page)

    await page.getByRole('button', { name: /Профиль: Анна Стажёрова/ }).click()
    await page.getByRole('menuitem', { name: 'Выйти' }).click()

    await expect(page.getByText('Вход в AI-buddy')).toBeVisible()
  })

  test('сессия сохраняется после перезагрузки', async ({ page }) => {
    await loginAsIntern(page)

    await page.reload()

    await expect(page.getByRole('heading', { name: 'Чат с наставником' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Профиль: Анна Стажёрова/ })).toBeVisible()
  })
})
