import { expect, test } from '@playwright/test'
import { projects, stubProjectList, stubTaskList, undatedTasks } from './api-stub.ts'

const [home] = projects

/** Ширина контента ленты из макета: форма и карточки дальше не растягиваются. */
const CONTENT_WIDTH = 760

/** Задача в проекте с заголовком, которому заведомо тесно в одной строке. */
const longTask = {
  ...undatedTasks[0],
  title:
    'Разобрать все коробки на балконе, вынести старую мебель, вызвать грузчиков и договориться о времени с управляющей компанией',
  projectId: home.id,
}

const shortTask = { ...undatedTasks[1], projectId: home.id }

test('подключает Inter из макета', async ({ page }) => {
  await stubProjectList(page)
  await stubTaskList(page)
  await page.goto('/')

  await expect(page.locator('link[rel="stylesheet"][href*="family=Inter"]')).toHaveCount(1)
})

test('форма и лента на широком экране не шире контента макета', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 })
  await stubProjectList(page, projects)
  await stubTaskList(page, [shortTask])
  await page.goto('/')

  const form = (await page.locator('.new-task').boundingBox())!
  const card = (await page.locator('.task-card').first().boundingBox())!

  expect(form.width).toBeLessThanOrEqual(CONTENT_WIDTH)
  expect(card.width).toBeLessThanOrEqual(CONTENT_WIDTH)
})

test('чип проекта стоит у правого края карточки на линии заголовка', async ({ page }) => {
  await stubProjectList(page, projects)
  await stubTaskList(page, [shortTask])
  await page.goto('/')

  const card = page.locator('.task-card').first()
  const chip = card.getByLabel(`Проект задачи «${shortTask.title}»`)

  await expect(chip).toBeVisible()
  await expect(chip).toHaveCSS('opacity', '1')

  const cardBox = (await card.boundingBox())!
  const chipBox = (await chip.boundingBox())!
  const titleBox = (await card.locator('.task-text').boundingBox())!

  expect(Math.abs(chipBox.x + chipBox.width - (cardBox.x + cardBox.width))).toBeLessThanOrEqual(1)

  const chipMiddle = chipBox.y + chipBox.height / 2
  expect(chipMiddle).toBeGreaterThanOrEqual(titleBox.y)
  expect(chipMiddle).toBeLessThanOrEqual(titleBox.y + titleBox.height)
})

test('длинный заголовок не наезжает на чип проекта', async ({ page }) => {
  await stubProjectList(page, projects)
  await stubTaskList(page, [longTask])
  await page.goto('/')

  const card = page.locator('.task-card').first()
  const chipBox = (await card.getByLabel(`Проект задачи «${longTask.title}»`).boundingBox())!
  const titleBox = (await card.locator('.task-text').boundingBox())!

  expect(titleBox.x + titleBox.width).toBeLessThanOrEqual(chipBox.x)
})

test('попап проекта у карточки прижат к правому краю чипа', async ({ page }) => {
  await stubProjectList(page, projects)
  await stubTaskList(page, [shortTask])
  await page.goto('/')

  const label = `Проект задачи «${shortTask.title}»`
  const chip = page.getByRole('button', { name: label })
  await chip.click()

  const chipBox = (await chip.boundingBox())!
  const popoverBox = (await page.getByRole('dialog', { name: label }).boundingBox())!

  expect(Math.abs(popoverBox.x + popoverBox.width - (chipBox.x + chipBox.width))).toBeLessThanOrEqual(1)
})
