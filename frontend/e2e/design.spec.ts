import { expect, test, type Locator } from '@playwright/test'
import { projects, stubProjectList, stubTaskList, undatedTasks } from './api-stub.ts'

/**
 * Раскладка экрана по макету из handoff. Числа взяты из разметки макета и
 * компонентов его дизайн-системы, а сравниваются с тем, что нарисовал браузер.
 */

const [home, other] = projects

/** Ширина контента ленты: форма и карточки дальше не растягиваются. */
const CONTENT_WIDTH = 760
/** От формы до ленты. */
const FORM_GAP = 40
/** Между пунктами левой колонки и от подписи раздела до первого пункта. */
const NAV_ITEM_GAP = 8
const NAV_LABEL_GAP = 16
/** Чип проекта у карточки: от низа строки задачи и зазор до его попапа. */
const TASK_CHIP_BOTTOM = 18
const TASK_POPOVER_GAP = 10
/** Зазор от чипа формы до его попапа. */
const FORM_POPOVER_GAP = 16

/** Задача в проекте с заголовком, которому заведомо тесно в одной строке. */
const longTask = {
  ...undatedTasks[0],
  title:
    'Разобрать все коробки на балконе, вынести старую мебель, вызвать грузчиков и договориться о времени с управляющей компанией',
  projectId: home.id,
}

const shortTask = { ...undatedTasks[1], projectId: home.id }

async function box(locator: Locator) {
  return (await locator.boundingBox())!
}

/** Расстояние по вертикали от низа верхнего элемента до верха нижнего. */
async function gapBetween(upper: Locator, lower: Locator) {
  const top = await box(upper)
  const bottom = await box(lower)

  return Math.round(bottom.y - (top.y + top.height))
}

test('подключает Inter', async ({ page }) => {
  await stubProjectList(page)
  await stubTaskList(page)
  await page.goto('/')

  await expect(page.locator('link[rel="stylesheet"][href*="family=Inter"]')).toHaveCount(1)
})

test('форма и лента на широком экране не шире контента', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 })
  await stubProjectList(page, projects)
  await stubTaskList(page, [shortTask])
  await page.goto('/')

  expect((await box(page.locator('.new-task'))).width).toBeLessThanOrEqual(CONTENT_WIDTH)
  expect((await box(page.locator('.task-item').first())).width).toBeLessThanOrEqual(CONTENT_WIDTH)
})

test('пустая лента отстоит от формы', async ({ page }) => {
  await stubProjectList(page)
  await stubTaskList(page, [])
  await page.goto('/')

  expect(await gapBetween(page.locator('.new-task'), page.getByText('Задач пока нет.'))).toBe(FORM_GAP)
})

test('первая группа ленты отстоит от формы так же', async ({ page }) => {
  await stubProjectList(page)
  await stubTaskList(page)
  await page.goto('/')

  const divider = page.getByRole('heading', { name: 'Без срока' })

  expect(await gapBetween(page.locator('.new-task'), divider)).toBe(FORM_GAP)
})

test('пункты левой колонки разнесены, как в макете', async ({ page }) => {
  await stubProjectList(page, projects)
  await stubTaskList(page)
  await page.goto('/')

  const lists = page.getByRole('navigation', { name: 'Списки' })
  const today = lists.getByRole('button', { name: 'Сегодня' })
  const all = lists.getByRole('button', { name: 'Все задачи' })

  expect(await gapBetween(lists.getByText('Списки'), today)).toBe(NAV_LABEL_GAP)
  expect(await gapBetween(today, all)).toBe(NAV_ITEM_GAP)

  const projectNav = page.getByRole('navigation', { name: 'Проекты' })
  const first = projectNav.getByRole('button', { name: home.name, exact: true })
  const second = projectNav.getByRole('button', { name: other.name, exact: true })

  expect(await gapBetween(projectNav.getByText('Проекты', { exact: true }), first)).toBe(NAV_LABEL_GAP)
  expect(await gapBetween(first, second)).toBe(NAV_ITEM_GAP)
  expect(await gapBetween(second, projectNav.getByRole('button', { name: 'Добавить проект' }))).toBe(
    NAV_ITEM_GAP,
  )
})

test('чип проекта стоит у правого края задачи на линии заголовка', async ({ page }) => {
  await stubProjectList(page, projects)
  await stubTaskList(page, [shortTask])
  await page.goto('/')

  const item = page.locator('.task-item').first()
  const chip = item.getByLabel(`Проект задачи «${shortTask.title}»`)

  await expect(chip).toHaveCSS('opacity', '1')

  const itemBox = await box(item)
  const chipBox = await box(chip)
  const titleBox = await box(item.locator('.task-text'))

  expect(Math.abs(chipBox.x + chipBox.width - (itemBox.x + itemBox.width))).toBeLessThanOrEqual(1)
  expect(Math.round(itemBox.y + itemBox.height - (chipBox.y + chipBox.height))).toBe(TASK_CHIP_BOTTOM)

  const chipMiddle = chipBox.y + chipBox.height / 2
  expect(chipMiddle).toBeGreaterThanOrEqual(titleBox.y)
  expect(chipMiddle).toBeLessThanOrEqual(titleBox.y + titleBox.height)
})

test('длинный заголовок не наезжает на чип проекта', async ({ page }) => {
  await stubProjectList(page, projects)
  await stubTaskList(page, [longTask])
  await page.goto('/')

  const item = page.locator('.task-item').first()
  const chipBox = await box(item.getByLabel(`Проект задачи «${longTask.title}»`))
  const titleBox = await box(item.locator('.task-text'))

  expect(titleBox.x + titleBox.width).toBeLessThanOrEqual(chipBox.x)
})

test('попап проекта у задачи прижат к правому краю чипа', async ({ page }) => {
  await stubProjectList(page, projects)
  await stubTaskList(page, [shortTask])
  await page.goto('/')

  const label = `Проект задачи «${shortTask.title}»`
  const chip = page.getByRole('button', { name: label })
  await chip.click()

  const chipBox = await box(chip)
  const popover = page.getByRole('dialog', { name: label })
  const popoverBox = await box(popover)

  expect(Math.abs(popoverBox.x + popoverBox.width - (chipBox.x + chipBox.width))).toBeLessThanOrEqual(1)
  expect(await gapBetween(chip, popover)).toBe(TASK_POPOVER_GAP)
})

test('попап чипа формы открывается с зазором макета', async ({ page }) => {
  await stubProjectList(page, projects)
  await stubTaskList(page)
  await page.goto('/')

  const chip = page.getByRole('button', { name: 'Проект задачи', exact: true })
  await chip.click()

  expect(await gapBetween(chip, page.getByRole('dialog', { name: 'Проект задачи', exact: true }))).toBe(
    FORM_POPOVER_GAP,
  )
})
