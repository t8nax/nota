import { expect, test } from '@playwright/test'
import { stubTaskList, undatedTasks } from './api-stub.ts'

test('лента показывает задачи, пришедшие от API', async ({ page }) => {
  await stubTaskList(page)
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Без срока' })).toBeVisible()

  for (const task of undatedTasks) {
    await expect(page.getByRole('checkbox', { name: task.title })).toBeVisible()
  }

  await expect(page.getByText('Осталось 2 задачи')).toBeVisible()
})
