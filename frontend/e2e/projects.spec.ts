import { expect, test } from '@playwright/test'
import { projects, stubProjectList, stubTaskList } from './api-stub.ts'

/** Ширина левой колонки из `App.css`: она задана сеткой и от содержимого не зависит. */
const SIDEBAR_WIDTH = 260

const [short, long] = projects

test('длинное имя проекта не раздвигает левую колонку', async ({ page }) => {
  await stubProjectList(page, projects)
  await stubTaskList(page)
  await page.goto('/')

  const sidebar = page.locator('.sidebar')
  await expect(sidebar).toHaveCSS('width', `${SIDEBAR_WIDTH}px`)

  // Имя обрезается многоточием, а не переносится и не вылезает за колонку.
  const name = page.locator('.project-name', { hasText: long.name })
  const box = (await name.boundingBox())!
  const sidebarBox = (await sidebar.boundingBox())!

  expect(box.x + box.width).toBeLessThanOrEqual(sidebarBox.x + sidebarBox.width)
  await expect(name).toHaveCSS('text-overflow', 'ellipsis')
})

test('на узком экране от проекта остаётся точка, а подпись уходит', async ({ page }) => {
  await stubProjectList(page, projects)
  await stubTaskList(page)
  await page.goto('/')
  await page.setViewportSize({ width: 900, height: 800 })

  await expect(page.locator('.project-dot').first()).toBeVisible()
  await expect(page.locator('.project-name').first()).toBeHidden()
  await expect(page.getByText('Проекты', { exact: true })).toBeHidden()
})

test('меню проекта открывается и остаётся в пределах окна', async ({ page }) => {
  await stubProjectList(page, projects)
  await stubTaskList(page)
  await page.goto('/')

  await page.getByLabel(`Действия проекта «${short.name}»`).click()

  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()

  const box = (await menu.boundingBox())!
  const viewport = page.viewportSize()!

  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
})
