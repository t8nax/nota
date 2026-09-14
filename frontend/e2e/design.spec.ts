import { expect, test, type Locator } from '@playwright/test'
import { projects, stubProjectList, stubTaskList, undatedTasks } from './api-stub.ts'

/**
 * Раскладка экрана по «Nota Design System»: числа взяты из шаблона экрана и
 * компонентов системы, а сравниваются с тем, что нарисовал браузер.
 */

const [home, other] = projects

/** Ширина контента ленты: форма и карточки дальше не растягиваются. */
const CONTENT_WIDTH = 760
/** От формы до ленты. */
const FORM_GAP = 40
/** Между пунктами левой колонки и от подписи раздела до первого пункта. */
const NAV_ITEM_GAP = 8
const NAV_LABEL_GAP = 12
/** Между разделами колонки. */
const NAV_SECTION_GAP = 32
/** Высота пункта колонки: широкий пункт с подписью и квадрат иконки на ≤1024px. */
const NAV_ITEM_HEIGHT = 45
const NAV_ICON_ITEM_HEIGHT = 44
/** Чип проекта у карточки: от низа строки задачи; попап встаёт на 4px ниже строки. */
const TASK_CHIP_BOTTOM = 18
const TASK_POPOVER_GAP = TASK_CHIP_BOTTOM + 4
/** Верхний отступ карточки задачи и зазор от строки срока до заголовка. */
const TASK_CARD_PADDING = 16
const TASK_META_GAP = 8
/** Зазор от чипа формы до его попапа. */
const FORM_POPOVER_GAP = 16
/** Окно правки задачи: ширина и зазор от поля до его попапа. */
const MODAL_WIDTH = 520
const EDIT_POPOVER_GAP = 8

/** Цвета токенов так, как их отдаёт браузер. */
const WHITE = 'rgb(255, 255, 255)'
const DIVIDER = 'rgb(44, 44, 46)'
const RED = 'rgb(255, 69, 58)'

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

test('пункты левой колонки разнесены, как в системе', async ({ page }) => {
  await stubProjectList(page, projects)
  await stubTaskList(page)
  await page.goto('/')

  const lists = page.getByRole('navigation', { name: 'Списки' })
  const inbox = lists.getByRole('button', { name: 'Входящие' })
  const today = lists.getByRole('button', { name: 'Сегодня' })
  const all = lists.getByRole('button', { name: 'Все задачи' })

  expect(await gapBetween(lists.getByText('Списки'), inbox)).toBe(NAV_LABEL_GAP)
  expect(await gapBetween(inbox, today)).toBe(NAV_ITEM_GAP)
  expect(await gapBetween(today, all)).toBe(NAV_ITEM_GAP)

  const projectNav = page.getByRole('navigation', { name: 'Проекты' })
  const first = projectNav.getByRole('button', { name: home.name, exact: true })
  const second = projectNav.getByRole('button', { name: other.name, exact: true })

  expect(await gapBetween(projectNav.getByText('Проекты', { exact: true }), first)).toBe(NAV_LABEL_GAP)
  expect(await gapBetween(first, second)).toBe(NAV_ITEM_GAP)
  expect(await gapBetween(second, projectNav.getByRole('button', { name: 'Добавить проект' }))).toBe(
    NAV_ITEM_GAP,
  )

  expect(await gapBetween(lists, projectNav)).toBe(NAV_SECTION_GAP)

  for (const item of await page.locator('.nav-item').all()) {
    expect((await box(item)).height).toBe(NAV_ITEM_HEIGHT)
  }
})

test('зазор проекта отсчитывается от строки вместе с «…»', async ({ page }) => {
  await stubProjectList(page, projects)
  await stubTaskList(page)
  await page.goto('/')

  const projectNav = page.getByRole('navigation', { name: 'Проекты' })
  const rows = projectNav.locator('.project-row')

  expect(await gapBetween(rows.nth(0), rows.nth(1))).toBe(NAV_ITEM_GAP)

  // Строка не шире своего пункта по высоте, и «…» стоит по его центру.
  const item = await box(projectNav.getByRole('button', { name: home.name, exact: true }))
  const row = await box(rows.nth(0))
  const menu = await box(projectNav.getByRole('button', { name: `Действия проекта «${home.name}»` }))

  expect(row.height).toBe(item.height)
  expect(menu.y + menu.height / 2).toBe(item.y + item.height / 2)
})

test('в свёрнутой колонке иконки-пункты разнесены так же', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 })
  await stubProjectList(page, projects)
  await stubTaskList(page)
  await page.goto('/')

  // Подписи на этой ширине скрыты, и пункты находятся только по месту.
  const items = await page.locator('.nav-item').all()
  const lists = page.getByRole('navigation', { name: 'Списки' }).locator('.nav-item')
  const projectItems = page.getByRole('navigation', { name: 'Проекты' }).locator('.nav-item')

  expect(await gapBetween(lists.nth(0), lists.nth(1))).toBe(NAV_ITEM_GAP)
  expect(await gapBetween(lists.nth(1), lists.nth(2))).toBe(NAV_ITEM_GAP)
  expect(await gapBetween(projectItems.nth(0), projectItems.nth(1))).toBe(NAV_ITEM_GAP)
  expect(await gapBetween(projectItems.nth(1), projectItems.nth(2))).toBe(NAV_ITEM_GAP)

  for (const item of items) {
    expect((await box(item)).height).toBe(NAV_ICON_ITEM_HEIGHT)
  }
})

test('пункт «Входящие» нарисован как остальные пункты колонки', async ({ page }) => {
  await stubProjectList(page)
  await stubTaskList(page)
  await page.goto('/')

  const lists = page.getByRole('navigation', { name: 'Списки' })
  const inbox = lists.getByRole('button', { name: 'Входящие' })
  const icon = inbox.locator('svg')

  expect(await box(lists.getByRole('button').first())).toEqual(await box(inbox))
  expect(await box(icon)).toMatchObject({ width: 20, height: 20 })
  await expect(icon).toHaveCSS('stroke-width', '2.2px')
  await expect(icon).toHaveCSS('fill', 'none')

  await inbox.click()

  await expect(inbox).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(inbox).toHaveCSS('box-shadow', 'rgba(0, 0, 0, 0.5) 0px 4px 12px 0px')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Входящие')
})

test('на узком экране пункт «Входящие» сжимается до знака', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 })
  await stubProjectList(page)
  await stubTaskList(page)
  await page.goto('/')

  // Скрытая подпись уносит и имя кнопки, поэтому пункт ищется по месту.
  const inbox = page.getByRole('navigation', { name: 'Списки' }).locator('.nav-item').first()

  await expect(inbox.locator('span', { hasText: 'Входящие' })).toBeHidden()
  expect(await box(inbox)).toMatchObject({ width: 44, height: 44 })
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

test('строка срока зарезервирована и у задачи без срока, «Срок» проявляется при наведении', async ({ page }) => {
  // Срок в давно прошедший день: задача просрочена при любой сегодняшней дате.
  const overdueTask = { ...undatedTasks[1], dueDate: '2020-01-15', dueTime: '18:00:00' }

  await stubProjectList(page)
  await stubTaskList(page, [overdueTask, undatedTasks[0]])
  await page.goto('/')

  const undated = page.locator('.task-card', { hasText: undatedTasks[0].title })
  const dated = page.locator('.task-card', { hasText: overdueTask.title })

  await expect(undated).toBeVisible()

  // Заголовок стоит на одной высоте в карточке со сроком и без него.
  for (const card of [undated, dated]) {
    const meta = card.locator('.task-meta')
    expect(Math.round((await box(meta)).y - (await box(card)).y)).toBe(TASK_CARD_PADDING)
    expect(await gapBetween(meta, card.locator('.task-content'))).toBe(TASK_META_GAP)
  }

  const quiet = undated.getByRole('button', { name: 'Срок' })
  await expect(quiet).toHaveCSS('opacity', '0')
  const heightBefore = (await box(undated)).height
  await undated.hover()
  await expect(quiet).toHaveCSS('opacity', '1')
  expect((await box(undated)).height).toBe(heightBefore)

  const due = dated.locator('.task-due')
  await expect(due).toHaveText('15 января, 18:00')
  await expect(due).toHaveCSS('font-size', '11px')
  await expect(due).toHaveCSS('font-weight', '700')
  // --tag-red
  await expect(due).toHaveCSS('color', 'rgb(255, 69, 58)')

  // Подложка сдвинута влево на свой паддинг: текст остаётся на линии заголовка.
  const dueBox = await box(due)
  const contentBox = await box(dated.locator('.task-content'))
  expect(Math.round(dueBox.x + 8 - contentBox.x)).toBe(0)

  await due.hover()
  await expect(due).toHaveCSS('background-color', 'rgba(255, 255, 255, 0.06)')
  await expect(due).toHaveCSS('border-radius', '999px')
  await expect(due).toHaveCSS('padding', '3px 8px')
  // На наведении просроченный срок остаётся красным.
  await expect(due).toHaveCSS('color', 'rgb(255, 69, 58)')
  await expect(dated.locator('.task-text')).toHaveCSS('cursor', 'pointer')
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

test('фокус и открытый попап отмечены белым, выбранный день — цветом поля', async ({ page }) => {
  await stubProjectList(page)
  await stubTaskList(page)
  await page.goto('/')

  const title = page.getByLabel('Заголовок новой задачи')
  await title.focus()
  await expect(title).toHaveCSS('border-color', 'rgb(255, 255, 255)')

  await page.getByRole('button', { name: 'Все задачи' }).click()
  await page.getByRole('button', { name: 'Сегодня' }).click()

  const chip = page.getByRole('button', { name: 'Дата срока' })
  await chip.click()
  await expect(chip).toHaveCSS('border-color', 'rgb(255, 255, 255)')

  // На «Сегодня» форма подставляет сегодняшний срок: выбранный день и сегодня совпадают.
  const selected = page.getByRole('dialog', { name: 'Выбор даты срока' }).locator('.cal-date.selected')
  await expect(selected).toHaveCSS('background-color', 'rgb(31, 31, 31)')
  await expect(selected).toHaveCSS('color', 'rgb(255, 255, 255)')
  await expect(selected).toHaveCSS('font-weight', '700')
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

test('окно правки собрано по макету, а рамка горит только у поля с открытым попапом', async ({ page }) => {
  const task = { ...undatedTasks[0], dueDate: '2020-01-15', dueTime: null }

  await stubProjectList(page, projects)
  await stubTaskList(page, [task])
  await page.goto('/')

  await page.getByRole('button', { name: task.title, exact: true }).click()

  const overlay = page.locator('.modal-overlay')
  const modal = page.getByRole('dialog', { name: 'Правка задачи' })
  await expect(overlay).toHaveCSS('background-color', 'rgba(0, 0, 0, 0.6)')
  await expect(overlay).toHaveCSS('backdrop-filter', 'blur(8px)')
  await expect(modal).toHaveCSS('border-radius', '24px')
  await expect(modal).toHaveCSS('padding', '32px')

  // Окно по центру экрана и не шире 520px.
  const viewport = page.viewportSize()!
  const modalBox = await box(modal)
  expect(Math.round(modalBox.width)).toBe(MODAL_WIDTH)
  expect(Math.abs(modalBox.x + modalBox.width / 2 - viewport.width / 2)).toBeLessThanOrEqual(1)
  expect(Math.abs(modalBox.y + modalBox.height / 2 - viewport.height / 2)).toBeLessThanOrEqual(1)

  // Задача под окном подсвечена.
  await expect(page.locator('.task-card.editing')).toHaveCount(1)

  const labels = modal.locator('.edit-label')
  const title = modal.locator('#edit-title')
  const projectField = modal.locator('#edit-project')
  const dateField = modal.locator('#edit-date')
  const timeField = modal.locator('#edit-time')

  expect(await gapBetween(modal.locator('.modal-head'), labels.first())).toBe(28)
  expect(await gapBetween(labels.first(), title)).toBe(8)
  expect(await gapBetween(title, labels.nth(1))).toBe(20)
  expect(await gapBetween(projectField, labels.nth(2))).toBe(20)
  await expect(labels.first()).toHaveCSS('text-transform', 'uppercase')
  await expect(projectField.locator('.project-dot')).toHaveCount(0)

  // Дата и время — две равные колонки через 16px.
  const dateBox = await box(dateField)
  const timeBox = await box(timeField)
  expect(Math.abs(dateBox.width - timeBox.width)).toBeLessThanOrEqual(1)
  expect(Math.round(timeBox.x - (dateBox.x + dateBox.width))).toBe(16)
  expect(Math.round(dateBox.y)).toBe(Math.round(timeBox.y))

  // Футер: «Сохранить» слева на всю оставшуюся ширину, удаление справа, 48px.
  const save = modal.getByRole('button', { name: 'Сохранить' })
  const remove = modal.getByRole('button', { name: 'Удалить задачу' })
  const saveBox = await box(save)
  const removeBox = await box(remove)
  expect(await gapBetween(dateField, save)).toBe(32)
  expect(Math.round(removeBox.width)).toBe(48)
  expect(Math.round(removeBox.x - (saveBox.x + saveBox.width))).toBe(12)
  expect(Math.round(saveBox.x - dateBox.x)).toBe(0)
  expect(Math.round(removeBox.x + removeBox.width - (timeBox.x + timeBox.width))).toBe(0)
  await expect(save).toHaveCSS('background-color', WHITE)
  await expect(remove).toHaveCSS('color', RED)
  await remove.hover()
  await expect(remove).toHaveCSS('background-color', 'rgba(255, 61, 87, 0.16)')

  for (const field of [title, projectField, dateField, timeField]) {
    await expect(field).toHaveCSS('border-color', DIVIDER)
    await expect(field).toHaveCSS('border-radius', '12px')
  }

  // Попап проекта — по ширине поля, на 8px ниже.
  await projectField.click()
  const projectPopover = page.getByRole('dialog', { name: 'Выбор проекта' })
  await expect(projectField).toHaveCSS('border-color', WHITE)
  const projectBox = await box(projectField)
  const projectPopoverBox = await box(projectPopover)
  expect(Math.round(projectPopoverBox.width)).toBe(Math.round(projectBox.width))
  expect(Math.round(projectPopoverBox.x)).toBe(Math.round(projectBox.x))
  expect(await gapBetween(projectField, projectPopover)).toBe(EDIT_POPOVER_GAP)

  // Попап проекта накрывает поле даты, поэтому сначала закрывается сам.
  await page.keyboard.press('Escape')
  await expect(projectPopover).toBeHidden()
  await expect(projectField).toHaveCSS('border-color', DIVIDER)

  // Календарь — от левого края поля даты; выбор дня гасит рамку.
  await dateField.click()
  await expect(dateField).toHaveCSS('border-color', WHITE)
  const calendar = page.getByRole('dialog', { name: 'Выбор даты срока' })
  expect(Math.round((await box(calendar)).x)).toBe(Math.round(dateBox.x))
  expect(await gapBetween(dateField, calendar)).toBe(EDIT_POPOVER_GAP)
  await calendar.getByRole('button', { name: 'Сегодня' }).click()
  await expect(dateField).toHaveCSS('border-color', DIVIDER)
  await expect(dateField).toHaveText('Сегодня')

  // Попап времени — от правого края поля времени; Escape закрывает только его.
  await timeField.click()
  const times = page.getByRole('dialog', { name: 'Выбор времени срока' })
  const timesBox = await box(times)
  expect(Math.round(timesBox.x + timesBox.width)).toBe(Math.round(timeBox.x + timeBox.width))
  expect(await gapBetween(timeField, times)).toBe(EDIT_POPOVER_GAP)
  await page.keyboard.press('Escape')
  await expect(times).toBeHidden()
  await expect(timeField).toHaveCSS('border-color', DIVIDER)
  await expect(modal).toBeVisible()
})

test('без даты поле времени приглушено, а с пустым заголовком — «Сохранить»', async ({ page }) => {
  await stubProjectList(page)
  await stubTaskList(page)
  await page.goto('/')

  await page.getByRole('button', { name: undatedTasks[0].title, exact: true }).click()

  const modal = page.getByRole('dialog', { name: 'Правка задачи' })
  await expect(modal.locator('#edit-time')).toHaveCSS('opacity', '0.45')
  await expect(modal.locator('#edit-time')).toHaveCSS('cursor', 'not-allowed')

  await modal.locator('#edit-title').fill('')
  await expect(modal.getByRole('button', { name: 'Сохранить' })).toHaveCSS('opacity', '0.3')
})

test('удалённая задача показывает красный попап с корзиной и возвращается', async ({ page }) => {
  const [first, second] = undatedTasks

  await stubProjectList(page)
  await stubTaskList(page)
  await page.goto('/')

  await page.getByRole('button', { name: first.title, exact: true }).click()
  await page.getByRole('button', { name: 'Удалить задачу' }).click()

  const toast = page.locator('.toast')
  await expect(toast).toHaveText(new RegExp(`Удалено: «${first.title}»`))
  await expect(toast.locator('.toast-countdown')).toHaveCSS('background-color', RED)
  await expect(toast.locator('.toast-icon')).toHaveCSS('color', RED)
  await expect(toast.getByRole('button', { name: 'Вернуть' })).toHaveCSS('color', RED)
  await expect(page.locator('.task-text')).toHaveText([second.title])

  await toast.getByRole('button', { name: 'Вернуть' }).click()

  await expect(page.locator('.task-text')).toHaveText([first.title, second.title])
})
