import { expect, test } from '@playwright/test'

import { loginAsIntern } from './helpers'

const viewports = [
  { width: 1440, height: 900, label: '1440' },
  { width: 1280, height: 900, label: '1280' },
  { width: 1024, height: 768, label: '1024' },
]

for (const viewport of viewports) {
  test(`нет горизонтального скролла на ${viewport.label}px`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await loginAsIntern(page)

    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )

    expect(hasOverflow).toBe(false)
    await expect(page.getByRole('heading', { name: 'Чат с наставником' })).toBeVisible()
    await expect(page.getByRole('progressbar', { name: 'Прогресс онбординга' })).toBeVisible()
  })
}
