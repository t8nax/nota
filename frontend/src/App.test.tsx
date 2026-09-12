import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { TOAST_LIFETIME_MS } from './components/Toasts'

/** Лента считает «сегодня» по часам машины, поэтому во всех тестах день фиксирован. */
const TODAY = '2026-09-12'

/** Ответ, каким его отдаёт настоящий API. */
function taskJson(
  title: string,
  isDone = false,
  dueDate: string | null = null,
  dueTime: string | null = null,
  projectId: string | null = null,
) {
  return {
    id: crypto.randomUUID(),
    title,
    isDone,
    createdAt: new Date().toISOString(),
    projectId,
    dueDate,
    dueTime,
  }
}

function projectJson(name: string) {
  return { id: crypto.randomUUID(), name, createdAt: new Date().toISOString() }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Подменяет fetch: список проектов отвечает сам по себе, остальные запросы берут
 * ответы из очереди по порядку. Запрос проектов уходит вместе с первой загрузкой
 * ленты, и без отдельной ветки он съедал бы ответ, приготовленный для задач.
 */
function stubFetch(replies: (Response | Promise<Response> | Error)[], projects: unknown[] = []) {
  const queue = [...replies]

  vi.mocked(fetch).mockImplementation((input, init) => {
    const url = String(input)
    const method = init?.method ?? 'GET'

    if (url === '/api/projects' && method === 'GET') return Promise.resolve(jsonResponse(projects))

    const next = queue.shift()

    if (next === undefined) return Promise.reject(new Error(`Нет ответа на ${method} ${url}`))

    return next instanceof Error ? Promise.reject(next) : Promise.resolve(next)
  })
}

/** Запросы этим методом в порядке отправки; запросы списков сюда не попадают. */
function callsWith(method: string) {
  return vi.mocked(fetch).mock.calls.filter(([, init]) => init?.method === method)
}

/** Сколько раз запрашивался список задач. */
function taskListRequests() {
  return vi.mocked(fetch).mock.calls.filter(([url, init]) => url === '/api/tasks' && !init?.method)
    .length
}

/** Ответ, которым тест управляет вручную: нужен, чтобы задать порядок возвратов. */
function deferredResponse() {
  let resolve!: (response: Response) => void
  const promise = new Promise<Response>((settle) => {
    resolve = settle
  })

  return { promise, resolve }
}

/** Срок задаётся своими попапами: чип открывает попап, выбор в нём закрывает. */
async function pickDate(day: string | RegExp) {
  await userEvent.click(screen.getByLabelText('Дата срока'))
  await userEvent.click(screen.getByRole('button', { name: day }))
}

async function pickTime(slot: string) {
  await userEvent.click(screen.getByLabelText('Время срока'))
  await userEvent.click(screen.getByRole('button', { name: slot }))
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date(2026, 8, 12, 10, 0))
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('форма добавления задачи', () => {
  it('показывает созданную задачу в списке без перезагрузки страницы', async () => {
    const created = taskJson('Купить хлеб')
    stubFetch([
      jsonResponse([]),
      jsonResponse(created, 201),
      jsonResponse([created]),
    ])

    render(<App />)
    await screen.findByText('Задач пока нет.')

    await userEvent.type(screen.getByLabelText('Заголовок новой задачи'), 'Купить хлеб')
    await userEvent.click(screen.getByRole('button', { name: 'Добавить' }))

    expect(await screen.findByText('Купить хлеб')).toBeInTheDocument()
    expect(screen.getByLabelText('Заголовок новой задачи')).toHaveValue('')
  })

  it('отправляет заданный срок вместе с заголовком', async () => {
    const created = taskJson('Позвонить маме', false, '2026-09-20', '18:00:00')
    stubFetch([
      jsonResponse([]),
      jsonResponse(created, 201),
      jsonResponse([created]),
    ])

    render(<App />)
    await screen.findByText('Задач пока нет.')

    await userEvent.type(screen.getByLabelText('Заголовок новой задачи'), 'Позвонить маме')
    await pickDate(/20 сентября 2026/)
    await pickTime('18:00')
    await userEvent.click(screen.getByRole('button', { name: 'Добавить' }))

    await screen.findByText('Позвонить маме')

    const [postCall] = callsWith('POST')
    expect(postCall[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({
        title: 'Позвонить маме',
        dueDate: '2026-09-20',
        dueTime: '18:00',
        projectId: null,
      }),
    })
  })

  it('без даты отправляет пустой срок', async () => {
    const created = taskJson('Разобрать шкаф')
    stubFetch([
      jsonResponse([]),
      jsonResponse(created, 201),
      jsonResponse([created]),
    ])

    render(<App />)
    await screen.findByText('Задач пока нет.')

    await userEvent.type(screen.getByLabelText('Заголовок новой задачи'), 'Разобрать шкаф')
    await userEvent.click(screen.getByRole('button', { name: 'Добавить' }))

    await screen.findByText('Разобрать шкаф')

    const [postCall] = callsWith('POST')
    expect(postCall[1]).toMatchObject({
      body: JSON.stringify({
        title: 'Разобрать шкаф',
        dueDate: null,
        dueTime: null,
        projectId: null,
      }),
    })
  })

  it('не даёт задать время, пока не выбрана дата', async () => {
    stubFetch([jsonResponse([])])

    render(<App />)
    await screen.findByText('Задач пока нет.')

    expect(screen.getByLabelText('Время срока')).toBeDisabled()

    await pickDate(/20 сентября 2026/)

    expect(screen.getByLabelText('Время срока')).toBeEnabled()
  })

  it('очищает поля срока после создания', async () => {
    const created = taskJson('Сдать отчёт', false, '2026-09-20')
    stubFetch([
      jsonResponse([]),
      jsonResponse(created, 201),
      jsonResponse([created]),
    ])

    render(<App />)
    await screen.findByText('Задач пока нет.')

    await userEvent.type(screen.getByLabelText('Заголовок новой задачи'), 'Сдать отчёт')
    await pickDate(/20 сентября 2026/)
    await userEvent.click(screen.getByRole('button', { name: 'Добавить' }))

    await screen.findByText('Сдать отчёт')
    expect(screen.getByLabelText('Дата срока')).toHaveTextContent('Срок')
  })

  it('показывает сообщение об ошибке от сервера и не добавляет задачу', async () => {
    stubFetch([
      jsonResponse([]),
      jsonResponse({ errors: { title: ['Заголовок задачи не может быть пустым.'] } }, 400),
    ])

    render(<App />)
    await screen.findByText('Задач пока нет.')

    await userEvent.type(screen.getByLabelText('Заголовок новой задачи'), 'что-то')
    await userEvent.click(screen.getByRole('button', { name: 'Добавить' }))

    const message = await screen.findByText('Заголовок задачи не может быть пустым.')
    expect(message.closest('.toast')).not.toBeNull()
    await waitFor(() => expect(screen.getByText('Задач пока нет.')).toBeInTheDocument())
  })

  it('не даёт отправить пустой заголовок', async () => {
    stubFetch([jsonResponse([])])

    render(<App />)
    await screen.findByText('Задач пока нет.')

    expect(screen.getByRole('button', { name: 'Добавить' })).toBeDisabled()

    await userEvent.type(screen.getByLabelText('Заголовок новой задачи'), '   ')
    expect(screen.getByRole('button', { name: 'Добавить' })).toBeDisabled()
  })

  it('не теряет созданную задачу, когда ответ первой загрузки приходит позже', async () => {
    const created = taskJson('Купить хлеб')
    const firstLoad = deferredResponse()
    stubFetch([
      firstLoad.promise,
      jsonResponse(created, 201),
      jsonResponse([created]),
    ])

    render(<App />)

    await userEvent.type(screen.getByLabelText('Заголовок новой задачи'), 'Купить хлеб')
    await userEvent.click(screen.getByRole('button', { name: 'Добавить' }))
    expect(await screen.findByText('Купить хлеб')).toBeInTheDocument()

    // Первая загрузка возвращается последней и знает список таким, каким он был до создания.
    await act(async () => {
      firstLoad.resolve(jsonResponse([]))
    })

    expect(screen.getByText('Купить хлеб')).toBeInTheDocument()
  })

})

describe('попап срока', () => {
  beforeEach(() => {
    stubFetch([jsonResponse([])])
  })

  it('ставит день кнопкой «Завтра»', async () => {
    render(<App />)
    await screen.findByText('Задач пока нет.')

    await userEvent.click(screen.getByLabelText('Дата срока'))
    await userEvent.click(screen.getByRole('button', { name: 'Завтра' }))

    expect(screen.getByLabelText('Дата срока')).toHaveTextContent('13 сентября')
  })

  it('переключает показанный месяц, не меняя выбранный день', async () => {
    render(<App />)
    await screen.findByText('Задач пока нет.')

    await pickDate(/20 сентября 2026/)
    await userEvent.click(screen.getByLabelText('Дата срока'))
    await userEvent.click(screen.getByRole('button', { name: 'Следующий месяц' }))

    expect(screen.getByText(/Октябрь 2026/)).toBeInTheDocument()
    expect(screen.getByLabelText('Дата срока')).toHaveTextContent('20 сентября')
  })

  it('снятие дня снимает и время', async () => {
    render(<App />)
    await screen.findByText('Задач пока нет.')

    await pickDate(/20 сентября 2026/)
    await pickTime('18:00')

    await userEvent.click(screen.getByLabelText('Дата срока'))
    await userEvent.click(screen.getByRole('button', { name: 'Убрать' }))

    expect(screen.getByLabelText('Дата срока')).toHaveTextContent('Срок')
    expect(screen.getByLabelText('Время срока')).toHaveTextContent('Время')
    expect(screen.getByLabelText('Время срока')).toBeDisabled()
  })

  it('принимает время, которого нет среди получасовых слотов', async () => {
    render(<App />)
    await screen.findByText('Задач пока нет.')

    await pickDate(/20 сентября 2026/)
    await userEvent.click(screen.getByLabelText('Время срока'))
    await userEvent.type(screen.getByLabelText('Точное время'), '18:15')

    expect(screen.getByLabelText('Время срока')).toHaveTextContent('18:15')
  })

  it('закрывается по Escape', async () => {
    render(<App />)
    await screen.findByText('Задач пока нет.')

    await userEvent.click(screen.getByLabelText('Дата срока'))
    expect(screen.getByRole('dialog', { name: 'Выбор даты срока' })).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('отметка выполнения', () => {
  it('убирает задачу с экрана и запоминает ответ сервера', async () => {
    const task = taskJson('Купить хлеб')
    stubFetch([
      jsonResponse([task]),
      jsonResponse({ ...task, isDone: true }),
    ])

    render(<App />)

    await userEvent.click(await screen.findByRole('checkbox', { name: 'Купить хлеб' }))

    await waitFor(() => expect(screen.queryByRole('checkbox', { name: 'Купить хлеб' })).toBeNull())

    const [patchCall] = callsWith('PATCH')
    expect(patchCall[0]).toBe(`/api/tasks/${task.id}`)
    expect(patchCall[1]).toMatchObject({ method: 'PATCH', body: JSON.stringify({ isDone: true }) })

    // Задача уходит с экрана фильтром по уже загруженному списку, поэтому список
    // не перезапрашивается: одной начальной загрузки достаточно.
    expect(taskListRequests()).toBe(1)
  })

  it('выполненную задачу не показывает и при загрузке списка', async () => {
    stubFetch([jsonResponse([taskJson('Полить цветы', true), taskJson('Купить хлеб')])])

    render(<App />)

    await screen.findByRole('checkbox', { name: 'Купить хлеб' })
    expect(screen.queryByText('Полить цветы')).toBeNull()
  })

  it('показывает попап с возвратом и возвращает задачу в ленту', async () => {
    const task = taskJson('Купить хлеб')
    stubFetch([
      jsonResponse([task]),
      jsonResponse({ ...task, isDone: true }),
      jsonResponse({ ...task, isDone: false }),
    ])

    render(<App />)

    await userEvent.click(await screen.findByRole('checkbox', { name: 'Купить хлеб' }))

    const message = await screen.findByText('Выполнено: Купить хлеб')
    expect(message.closest('.toast')).not.toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Вернуть' }))

    expect(await screen.findByRole('checkbox', { name: 'Купить хлеб' })).not.toBeChecked()
    expect(screen.queryByText('Выполнено: Купить хлеб')).toBeNull()

    const [, restoreCall] = callsWith('PATCH')
    expect(restoreCall[1]).toMatchObject({ method: 'PATCH', body: JSON.stringify({ isDone: false }) })
  })

  it('трогает только ту задачу, по которой кликнули', async () => {
    const first = taskJson('Забрать посылку')
    const second = taskJson('Позвонить врачу')
    stubFetch([
      jsonResponse([first, second]),
      jsonResponse({ ...first, isDone: true }),
    ])

    render(<App />)

    await userEvent.click(await screen.findByRole('checkbox', { name: 'Забрать посылку' }))

    await waitFor(() => expect(screen.queryByText('Забрать посылку')).toBeNull())
    expect(screen.getByRole('checkbox', { name: 'Позвонить врачу' })).not.toBeChecked()
  })

  it('не теряет срок задачи, вернувшейся из попапа', async () => {
    const task = taskJson('Оплатить счёт', false, TODAY, '12:00:00')
    stubFetch([
      jsonResponse([task]),
      jsonResponse({ ...task, isDone: true }),
      jsonResponse({ ...task, isDone: false }),
    ])

    render(<App />)

    await userEvent.click(await screen.findByRole('checkbox', { name: 'Оплатить счёт' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Вернуть' }))

    expect(await screen.findByRole('checkbox', { name: 'Оплатить счёт' })).toBeInTheDocument()
    expect(screen.getByText('12:00')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Сегодня' })).toBeInTheDocument()
  })

  it('показывает ошибку сервера и оставляет отметку прежней', async () => {
    const task = taskJson('Сдать отчёт')
    stubFetch([
      jsonResponse([task]),
      jsonResponse({ title: 'Not Found' }, 404),
    ])

    render(<App />)

    await userEvent.click(await screen.findByRole('checkbox', { name: 'Сдать отчёт' }))

    expect(await screen.findByText('Произошла ошибка. Попробуйте позже.')).toBeInTheDocument()
    expect(screen.queryByText(/404/)).toBeNull()
    expect(screen.queryByText(/Not Found/)).toBeNull()
    expect(screen.getByRole('checkbox', { name: 'Сдать отчёт' })).not.toBeChecked()
  })
})

describe('лента задач', () => {
  it('разделяет задачи по сроку и подписывает состояние', async () => {
    const tasks = [
      taskJson('Просроченная', false, '2026-09-10'),
      taskJson('Сегодняшняя', false, TODAY, '09:30:00'),
      taskJson('Завтрашняя', false, '2026-09-13'),
      taskJson('Бессрочная'),
    ]
    stubFetch([jsonResponse(tasks)])

    render(<App />)

    expect(await screen.findByText('Просрочено')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Сегодня' })).toBeInTheDocument()
    expect(screen.getByText('Завтра')).toBeInTheDocument()
    expect(screen.getByText('Без срока')).toBeInTheDocument()
    expect(screen.getByText('09:30')).toBeInTheDocument()
    expect(screen.getAllByText('В работе')).toHaveLength(tasks.length)
  })

  it('у просроченной задачи показывает дату, а не одно время', async () => {
    stubFetch([jsonResponse([taskJson('Забытая', false, '2026-09-10', '08:00:00')])])

    render(<App />)

    expect(await screen.findByText('10 сентября, 08:00')).toBeInTheDocument()
  })

  it('у задачи без срока не показывает ни даты, ни времени', async () => {
    stubFetch([jsonResponse([taskJson('Когда-нибудь')])])

    render(<App />)

    await screen.findByText('Когда-нибудь')
    expect(screen.queryByText('Без срока')).toBeInTheDocument()
    expect(document.querySelector('.task-due')).toBeNull()
  })

  it('считает в шапке только видимые задачи', async () => {
    const tasks = [
      taskJson('Первая', false, TODAY),
      taskJson('Вторая', false, TODAY),
      taskJson('Третья', true, TODAY),
    ]
    stubFetch([jsonResponse(tasks)])

    render(<App />)

    expect(await screen.findByText('Осталось 2 задачи')).toBeInTheDocument()
  })

  it('после отметки последней задачи лента пуста', async () => {
    const task = taskJson('Последняя', false, TODAY)
    stubFetch([
      jsonResponse([task]),
      jsonResponse({ ...task, isDone: true }),
    ])

    render(<App />)

    await userEvent.click(await screen.findByRole('checkbox', { name: 'Последняя' }))

    expect(await screen.findByText('Задач пока нет.')).toBeInTheDocument()
    expect(screen.queryByText(/Осталось/)).toBeNull()
  })
})

describe('попап ошибки', () => {
  /** Отказ на отметке — самый короткий путь показать попап. */
  async function failToggle(body: unknown, status: number) {
    const task = taskJson('Сдать отчёт')
    stubFetch([
      jsonResponse([task]),
      jsonResponse(body, status),
    ])

    render(<App />)
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Сдать отчёт' }))
  }

  it('показывает сообщение попапом, а не строкой в ленте', async () => {
    await failToggle({ errors: { request: ['Нужно передать хотя бы одно изменяемое поле.'] } }, 400)

    const message = await screen.findByText('Нужно передать хотя бы одно изменяемое поле.')
    expect(message.closest('.toast')).not.toBeNull()
    expect(document.querySelector('.main-stream .error')).toBeNull()
  })

  it('показывает полоску, укорачивающуюся ровно за время жизни попапа', async () => {
    await failToggle({ title: 'Not Found' }, 404)
    await screen.findByText('Произошла ошибка. Попробуйте позже.')

    const countdown = document.querySelector<HTMLElement>('.toast-countdown')
    expect(countdown).not.toBeNull()
    expect(countdown?.style.animationDuration).toBe(`${TOAST_LIFETIME_MS}ms`)
  })

  it('убирает попап сам через отведённое время', async () => {
    await failToggle({ title: 'Not Found' }, 404)
    await screen.findByText('Произошла ошибка. Попробуйте позже.')

    act(() => {
      vi.advanceTimersByTime(TOAST_LIFETIME_MS)
    })

    expect(screen.queryByText('Произошла ошибка. Попробуйте позже.')).toBeNull()
  })

  it('закрывается по кнопке, не дожидаясь времени', async () => {
    await failToggle({ title: 'Not Found' }, 404)
    await screen.findByText('Произошла ошибка. Попробуйте позже.')

    await userEvent.click(screen.getByRole('button', { name: 'Закрыть сообщение' }))

    expect(screen.queryByText('Произошла ошибка. Попробуйте позже.')).toBeNull()
  })

  it('сетевой сбой без ответа сервера показывает тот же общий текст', async () => {
    const task = taskJson('Сдать отчёт')
    stubFetch([
      jsonResponse([task]),
      new TypeError('Failed to fetch'),
    ])

    render(<App />)
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Сдать отчёт' }))

    expect(await screen.findByText('Произошла ошибка. Попробуйте позже.')).toBeInTheDocument()
    expect(screen.queryByText(/Failed to fetch/)).toBeNull()
  })
})

describe('раздел «Сегодня»', () => {
  /** Список, в котором есть по задаче каждого вида срока. */
  function mixedTasks() {
    return [
      taskJson('Просроченная', false, '2026-09-10'),
      taskJson('Сегодняшняя', false, TODAY, '09:30:00'),
      taskJson('Завтрашняя', false, '2026-09-13'),
      taskJson('Бессрочная'),
    ]
  }

  async function openToday() {
    await userEvent.click(screen.getByRole('button', { name: 'Сегодня' }))
  }

  it('оставляет просроченное и сегодняшнее, пряча остальное', async () => {
    stubFetch([jsonResponse(mixedTasks())])

    render(<App />)
    await screen.findByText('Завтрашняя')
    await openToday()

    expect(screen.getByText('Просроченная')).toBeInTheDocument()
    expect(screen.getByText('Сегодняшняя')).toBeInTheDocument()
    expect(screen.queryByText('Завтрашняя')).toBeNull()
    expect(screen.queryByText('Бессрочная')).toBeNull()
  })

  it('подписывает экран днём и остатком видимых задач', async () => {
    stubFetch([jsonResponse(mixedTasks())])

    render(<App />)
    await screen.findByText('Завтрашняя')
    await openToday()

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Сегодня')
    expect(screen.getByText('Суббота, 12 сентября · Осталось 2 задачи')).toBeInTheDocument()
  })

  it('без задач на сегодня говорит об этом, а не молчит', async () => {
    stubFetch([jsonResponse([taskJson('Завтрашняя', false, '2026-09-13'), taskJson('Бессрочная')])])

    render(<App />)
    await screen.findByText('Завтрашняя')
    await openToday()

    expect(screen.getByText('На сегодня задач нет.')).toBeInTheDocument()
  })

  it('возврат к «Всем задачам» показывает список целиком', async () => {
    stubFetch([jsonResponse(mixedTasks())])

    render(<App />)
    await screen.findByText('Завтрашняя')
    await openToday()
    await userEvent.click(screen.getByRole('button', { name: 'Все задачи' }))

    expect(screen.getByText('Бессрочная')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Сентябрь 2026')
  })

  it('отмечает открытый раздел в левой колонке', async () => {
    stubFetch([jsonResponse([])])

    render(<App />)
    await openToday()

    expect(screen.getByRole('button', { name: 'Сегодня' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Все задачи' })).not.toHaveAttribute('aria-current')
  })
})

describe('экран проекта', () => {
  it('показывает проекты в левой колонке', async () => {
    const projects = [projectJson('Дом'), projectJson('Работа')]
    stubFetch([jsonResponse([])], projects)

    render(<App />)

    expect(await screen.findByRole('button', { name: 'Дом' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Работа' })).toBeInTheDocument()
  })

  it('без проектов говорит об этом вместо пустого раздела', async () => {
    stubFetch([jsonResponse([])])

    render(<App />)

    expect(await screen.findByText('Проектов пока нет')).toBeInTheDocument()
  })

  it('оставляет задачи открытого проекта и подписывает экран его именем', async () => {
    const home = projectJson('Дом')
    const work = projectJson('Работа')
    stubFetch(
      [jsonResponse([
        taskJson('Полить цветы', false, null, null, home.id),
        taskJson('Сдать отчёт', false, null, null, work.id),
        taskJson('Без проекта'),
      ])],
      [home, work],
    )

    render(<App />)
    await userEvent.click(await screen.findByRole('button', { name: 'Дом' }))

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Дом')
    expect(screen.getByText('Полить цветы')).toBeInTheDocument()
    expect(screen.queryByText('Сдать отчёт')).toBeNull()
    expect(screen.queryByText('Без проекта')).toBeNull()
  })

  it('пустой проект говорит об этом, а не молчит', async () => {
    const home = projectJson('Дом')
    stubFetch([jsonResponse([taskJson('Без проекта')])], [home])

    render(<App />)
    await userEvent.click(await screen.findByRole('button', { name: 'Дом' }))

    expect(screen.getByText('В проекте пока нет задач.')).toBeInTheDocument()
  })

  it('созданная на экране проекта задача уходит в этот проект', async () => {
    const home = projectJson('Дом')
    const created = taskJson('Полить цветы', false, null, null, home.id)
    stubFetch(
      [jsonResponse([]), jsonResponse(created, 201), jsonResponse([created])],
      [home],
    )

    render(<App />)
    await userEvent.click(await screen.findByRole('button', { name: 'Дом' }))

    await userEvent.type(screen.getByLabelText('Заголовок новой задачи'), 'Полить цветы')
    await userEvent.click(screen.getByRole('button', { name: 'Добавить' }))

    await screen.findByText('Полить цветы')

    const [postCall] = callsWith('POST')
    expect(postCall[1]).toMatchObject({
      body: JSON.stringify({
        title: 'Полить цветы',
        dueDate: null,
        dueTime: null,
        projectId: home.id,
      }),
    })
  })

  it('отмечает открытый проект в левой колонке', async () => {
    const home = projectJson('Дом')
    stubFetch([jsonResponse([])], [home])

    render(<App />)
    await userEvent.click(await screen.findByRole('button', { name: 'Дом' }))

    expect(screen.getByRole('button', { name: 'Дом' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Все задачи' })).not.toHaveAttribute('aria-current')
  })
})

describe('ведение проектов', () => {
  /** Заводит проект через раздел левой колонки. */
  async function addProject(name: string) {
    await userEvent.click(screen.getByLabelText('Добавить проект'))
    await userEvent.type(screen.getByLabelText('Название проекта'), name)
    await userEvent.click(screen.getByRole('button', { name: 'Готово' }))
  }

  /** Открывает меню действий проекта, дождавшись загрузки списка проектов. */
  async function openMenu(name: string) {
    await userEvent.click(await screen.findByLabelText(`Действия проекта «${name}»`))
  }

  it('заводит проект и показывает его в колонке', async () => {
    const created = projectJson('Дом')
    stubFetch([jsonResponse([]), jsonResponse(created, 201)])

    render(<App />)
    await screen.findByText('Проектов пока нет')

    await addProject('Дом')

    expect(await screen.findByRole('button', { name: 'Дом' })).toBeInTheDocument()

    const [postCall] = callsWith('POST')
    expect(postCall[0]).toBe('/api/projects')
    expect(postCall[1]).toMatchObject({ body: JSON.stringify({ name: 'Дом' }) })
  })

  it('отказ сервера показывает попапом и оставляет введённое имя', async () => {
    stubFetch([
      jsonResponse([]),
      jsonResponse({ errors: { name: ['Название проекта не может быть пустым.'] } }, 400),
    ])

    render(<App />)
    await screen.findByText('Проектов пока нет')

    await addProject('Дом')

    expect(await screen.findByText('Название проекта не может быть пустым.')).toBeInTheDocument()
    expect(screen.getByLabelText('Название проекта')).toHaveValue('Дом')
  })

  it('переименовывает проект', async () => {
    const home = projectJson('Дом')
    stubFetch([jsonResponse([]), jsonResponse({ ...home, name: 'Дача' })], [home])

    render(<App />)
    await openMenu('Дом')
    await userEvent.click(screen.getByRole('menuitem', { name: 'Переименовать' }))

    const field = screen.getByLabelText('Новое название проекта')
    expect(field).toHaveValue('Дом')

    await userEvent.clear(field)
    await userEvent.type(field, 'Дача')
    await userEvent.click(screen.getByRole('button', { name: 'Готово' }))

    expect(await screen.findByRole('button', { name: 'Дача' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Дом' })).toBeNull()

    const [patchCall] = callsWith('PATCH')
    expect(patchCall[0]).toBe(`/api/projects/${home.id}`)
    expect(patchCall[1]).toMatchObject({ body: JSON.stringify({ name: 'Дача' }) })
  })

  it('спрашивает перед удалением и не трогает проект при отказе', async () => {
    const home = projectJson('Дом')
    stubFetch([jsonResponse([])], [home])

    render(<App />)
    await openMenu('Дом')
    await userEvent.click(screen.getByRole('menuitem', { name: 'Удалить' }))

    expect(screen.getByText('Удалить проект «Дом» вместе с задачами?')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Отмена' }))

    expect(screen.getByRole('button', { name: 'Дом' })).toBeInTheDocument()
    expect(callsWith('DELETE')).toHaveLength(0)
  })

  it('удаляет проект вместе с его задачами и возвращает на «Все задачи»', async () => {
    const home = projectJson('Дом')
    stubFetch(
      [
        jsonResponse([
          taskJson('Полить цветы', false, null, null, home.id),
          taskJson('Купить хлеб'),
        ]),
        new Response(null, { status: 204 }),
      ],
      [home],
    )

    render(<App />)
    await userEvent.click(await screen.findByRole('button', { name: 'Дом' }))
    await openMenu('Дом')
    await userEvent.click(screen.getByRole('menuitem', { name: 'Удалить' }))
    await userEvent.click(screen.getByRole('button', { name: 'Удалить' }))

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Дом' })).toBeNull())

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Сентябрь 2026')
    expect(screen.getByText('Купить хлеб')).toBeInTheDocument()
    expect(screen.queryByText('Полить цветы')).toBeNull()

    const [deleteCall] = callsWith('DELETE')
    expect(deleteCall[0]).toBe(`/api/projects/${home.id}`)
  })

  it('отказ удаления оставляет проект на месте', async () => {
    const home = projectJson('Дом')
    stubFetch([jsonResponse([]), jsonResponse({ title: 'Not Found' }, 404)], [home])

    render(<App />)
    await openMenu('Дом')
    await userEvent.click(screen.getByRole('menuitem', { name: 'Удалить' }))
    await userEvent.click(screen.getByRole('button', { name: 'Удалить' }))

    expect(await screen.findByText('Произошла ошибка. Попробуйте позже.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Дом' })).toBeInTheDocument()
  })
})

describe('проект задачи', () => {
  /** Выбирает проект в попапе: кнопка с тем же именем есть и в левой колонке. */
  async function pickProject(label: string, name: string) {
    await userEvent.click(await screen.findByLabelText(label))
    await userEvent.click(
      within(screen.getByRole('dialog', { name: label })).getByRole('button', { name }),
    )
  }

  it('форма отправляет выбранный в ней проект', async () => {
    const home = projectJson('Дом')
    const created = taskJson('Полить цветы', false, null, null, home.id)
    stubFetch([jsonResponse([]), jsonResponse(created, 201), jsonResponse([created])], [home])

    render(<App />)
    await screen.findByText('Задач пока нет.')

    await userEvent.type(screen.getByLabelText('Заголовок новой задачи'), 'Полить цветы')
    await pickProject('Проект задачи', 'Дом')
    await userEvent.click(screen.getByRole('button', { name: 'Добавить' }))

    await screen.findByText('Полить цветы')

    const [postCall] = callsWith('POST')
    expect(postCall[1]).toMatchObject({
      body: JSON.stringify({
        title: 'Полить цветы',
        dueDate: null,
        dueTime: null,
        projectId: home.id,
      }),
    })
  })

  it('переносит задачу в другой проект и убирает её с экрана прежнего', async () => {
    const home = projectJson('Дом')
    const work = projectJson('Работа')
    const task = taskJson('Полить цветы', false, null, null, home.id)
    stubFetch(
      [jsonResponse([task]), jsonResponse({ ...task, projectId: work.id })],
      [home, work],
    )

    render(<App />)
    await userEvent.click(await screen.findByRole('button', { name: 'Дом' }))

    await pickProject('Проект задачи «Полить цветы»', 'Работа')

    await waitFor(() => expect(screen.queryByText('Полить цветы')).toBeNull())

    const [patchCall] = callsWith('PATCH')
    expect(patchCall[0]).toBe(`/api/tasks/${task.id}`)
    expect(patchCall[1]).toMatchObject({ body: JSON.stringify({ projectId: work.id }) })
  })

  it('снимает проект с задачи', async () => {
    const home = projectJson('Дом')
    const task = taskJson('Полить цветы', false, null, null, home.id)
    stubFetch([jsonResponse([task]), jsonResponse({ ...task, projectId: null })], [home])

    render(<App />)

    await pickProject('Проект задачи «Полить цветы»', 'Без проекта')

    const [patchCall] = callsWith('PATCH')
    expect(patchCall[1]).toMatchObject({ body: JSON.stringify({ projectId: null }) })
    await waitFor(() =>
      expect(screen.getByLabelText('Проект задачи «Полить цветы»')).toHaveTextContent('Без проекта'),
    )
  })

  it('отказ переноса показывает попап и оставляет задачу в прежнем проекте', async () => {
    const home = projectJson('Дом')
    const work = projectJson('Работа')
    const task = taskJson('Полить цветы', false, null, null, home.id)
    stubFetch([jsonResponse([task]), jsonResponse({ title: 'Not Found' }, 404)], [home, work])

    render(<App />)

    await pickProject('Проект задачи «Полить цветы»', 'Работа')

    expect(await screen.findByText('Произошла ошибка. Попробуйте позже.')).toBeInTheDocument()
    expect(screen.getByLabelText('Проект задачи «Полить цветы»')).toHaveTextContent('Дом')
  })

  it('без проектов карточка не предлагает выбор', async () => {
    stubFetch([jsonResponse([taskJson('Полить цветы')])])

    render(<App />)

    await screen.findByText('Полить цветы')
    expect(screen.queryByLabelText('Проект задачи «Полить цветы»')).toBeNull()
  })
})
