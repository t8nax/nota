import { expect, test } from '@playwright/test'
import { stubFailingToggle, stubProjectList, stubTaskList, undatedTasks } from './api-stub.ts'

/** Ширина попапа из `App.css`: шире он не бывает ни на каком экране. */
const MAX_TOAST_WIDTH = 320

/** Зазор до края экрана: 24px на широком, 16px на узком. */
const NARROW_GUTTER = 16

const viewports = [
  { name: 'узкий экран', width: 375 },
  { name: 'широкий экран', width: 1280 },
]

for (const viewport of viewports) {
  test(`попап ошибки не растягивается: ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: 720 })
    await stubProjectList(page)
  await stubTaskList(page)
    await stubFailingToggle(page)
    await page.goto('/')

    await page.getByRole('checkbox', { name: undatedTasks[0].title }).click()

    const toast = page.locator('.toast')
    await expect(toast).toHaveText(/Произошла ошибка/)

    const box = await toast.boundingBox()
    expect(box).not.toBeNull()
    if (box === null) return

    // Попап держит свою ширину и помещается в экран, а не тянется во всю ленту.
    expect(box.width).toBeLessThanOrEqual(MAX_TOAST_WIDTH)
    expect(box.x).toBeGreaterThanOrEqual(NARROW_GUTTER)
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width - NARROW_GUTTER)
  })
}
