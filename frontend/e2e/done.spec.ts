import { expect, test } from '@playwright/test'
import { stubProjectList, stubTaskList, stubToggle, undatedTasks } from './api-stub.ts'

const [first, second] = undatedTasks

test('выполненная задача уходит с экрана и возвращается попапом', async ({ page }) => {
  await stubProjectList(page)
  await stubTaskList(page)
  await stubToggle(page)
  await page.goto('/')

  await page.getByRole('checkbox', { name: first.title }).click()

  // Задача уходит из ленты, а соседняя остаётся на месте.
  await expect(page.getByRole('checkbox', { name: first.title })).toBeHidden()
  await expect(page.getByRole('checkbox', { name: second.title })).toBeVisible()
  await expect(page.getByText('Осталось 1 задача')).toBeVisible()

  const toast = page.locator('.toast')
  await expect(toast).toHaveText(new RegExp(`Выполнено: ${first.title}`))

  await toast.getByRole('button', { name: 'Вернуть' }).click()

  await expect(page.getByRole('checkbox', { name: first.title })).toBeVisible()
  await expect(toast).toBeHidden()
  await expect(page.getByText('Осталось 2 задачи')).toBeVisible()

  // Задача встаёт на своё прежнее место: порядок ленты считает сервер, и возврат его не меняет.
  await expect(page.locator('.task-text')).toHaveText([first.title, second.title])
})

test('после последней задачи лента говорит, что задач нет', async ({ page }) => {
  await stubProjectList(page)
  await stubTaskList(page, [first])
  await stubToggle(page, [first])
  await page.goto('/')

  await page.getByRole('checkbox', { name: first.title }).click()

  await expect(page.getByText('Задач пока нет.')).toBeVisible()
})
