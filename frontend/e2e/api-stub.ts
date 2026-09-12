import type { Page } from '@playwright/test'

/**
 * Задачи без срока: лента режется по дням, и «Без срока» — единственная группа,
 * которая не зависит от того, какой сегодня день.
 */
export const undatedTasks = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    title: 'Забрать посылку',
    isDone: false,
    createdAt: '2026-09-12T09:00:00Z',
    projectId: null,
    dueDate: null,
    dueTime: null,
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    title: 'Позвонить маме',
    isDone: false,
    createdAt: '2026-09-12T09:05:00Z',
    projectId: null,
    dueDate: null,
    dueTime: null,
  },
]

/** Проекты для проверок левой колонки: имена разной длины, включая заведомо длинное. */
export const projects = [
  { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Дом', createdAt: '2026-09-12T08:00:00Z' },
  {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    name: 'Ремонт квартиры на Профсоюзной и всё вокруг него',
    createdAt: '2026-09-12T08:10:00Z',
  },
]

/** Ответ на список проектов: без него запрос ушёл бы на несуществующий бэкенд. */
export async function stubProjectList(page: Page, list: typeof projects | [] = []) {
  await page.route('**/api/projects', async (route) => {
    await route.fulfill({ json: list })
  })
}

/** Ответ на список задач: браузерный прогон идёт без бэкенда и без базы. */
export async function stubTaskList(page: Page, tasks = undatedTasks) {
  await page.route('**/api/tasks', async (route) => {
    await route.fulfill({ json: tasks })
  })
}

/**
 * Отметка выполнения удаётся: отвечает задачей с тем значением отметки, которое
 * пришло в запросе, как это делает настоящий API.
 */
export async function stubToggle(page: Page, tasks = undatedTasks) {
  await page.route('**/api/tasks/*', async (route) => {
    const id = new URL(route.request().url()).pathname.split('/').pop()
    const task = tasks.find((candidate) => candidate.id === id)
    const { isDone } = route.request().postDataJSON() as { isDone: boolean }

    await route.fulfill({ json: { ...task, isDone } })
  })
}

/** Отметка выполнения отказывает: так на экране появляется попап ошибки. */
export async function stubFailingToggle(page: Page) {
  await page.route('**/api/tasks/*', async (route) => {
    await route.fulfill({ status: 500, json: {} })
  })
}
