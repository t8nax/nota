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

/** Тона палитры из `index.css`: второй по яркости и самый приглушённый. */
const SECONDARY = 'rgb(142, 142, 147)'
const TERTIARY = 'rgb(72, 72, 74)'

test('пункт заведения проекта написан читаемым тоном', async ({ page }) => {
  await stubProjectList(page, projects)
  await stubTaskList(page)
  await page.goto('/')

  // Приглушённым тоном он на тёмном фоне почти не виден, а вход в заведение один.
  const add = page.getByText('Добавить проект')
  await expect(add).toHaveCSS('color', SECONDARY)
  await expect(add).not.toHaveCSS('color', TERTIARY)
})

test('кнопка «Готово» вровень с полем ввода имени', async ({ page }) => {
  await stubProjectList(page, projects)
  await stubTaskList(page)
  await page.goto('/')

  await page.getByText('Добавить проект').click()

  const field = (await page.getByLabel('Название проекта').boundingBox())!
  const submit = (await page.getByRole('button', { name: 'Готово' }).boundingBox())!

  expect(Math.abs(submit.height - field.height)).toBeLessThanOrEqual(1)
})

test('чип проекта у задачи без проекта виден только при наведении', async ({ page }) => {
  await stubProjectList(page, projects)
  await stubTaskList(page)
  await page.goto('/')

  const item = page.locator('.task-item').first()
  // Прячется слот целиком, поэтому и прозрачность снимается с него, а не с кнопки.
  const slot = item.locator('.project-slot-empty')

  await expect(slot).toHaveCSS('opacity', '0')

  await item.locator('.task-card').hover()

  await expect(slot).toHaveCSS('opacity', '1')
})

test('пункт заведения проекта стоит под списком', async ({ page }) => {
  await stubProjectList(page, projects)
  await stubTaskList(page)
  await page.goto('/')

  const lastProject = (await page.locator('.project-row').last().boundingBox())!
  const add = (await page.getByText('Добавить проект').boundingBox())!

  expect(add.y).toBeGreaterThan(lastProject.y)

  // Оба входа ведут к одному полю, и оно открывается там же, под списком.
  await page.getByText('Добавить проект').click()

  const field = (await page.getByLabel('Название проекта').boundingBox())!
  expect(field.y).toBeGreaterThan(lastProject.y)
})
