import { expect, type Page } from '@playwright/test'

export async function loginAs(page: Page, name = 'Анна Стажёрова') {
  await page.goto('/login')
  await page.getByRole('button', { name: new RegExp(name) }).click()
  await expect(page.getByRole('heading', { name: 'Чат с наставником' })).toBeVisible()
}

export async function loginAsIntern(page: Page) {
  await loginAs(page)
}
