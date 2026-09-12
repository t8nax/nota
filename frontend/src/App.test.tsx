import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

/** Лента считает «сегодня» по часам машины, поэтому во всех тестах день фиксирован. */
const TODAY = '2026-09-12'

/** Ответ, каким его отдаёт настоящий API. */
function taskJson(
  title: string,
  isDone = false,
  dueDate: string | null = null,
  dueTime: string | null = null,
) {
  return {
    id: crypto.randomUUID(),
    title,
    isDone,
    createdAt: new Date().toISOString(),
    dueDate,
    dueTime,
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
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
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(jsonResponse([]))
    fetchMock.mockResolvedValueOnce(jsonResponse(created, 201))
    fetchMock.mockResolvedValueOnce(jsonResponse([created]))

    render(<App />)
    await screen.findByText('Задач пока нет.')

    await userEvent.type(screen.getByLabelText('Заголовок новой задачи'), 'Купить хлеб')
    await userEvent.click(screen.getByRole('button', { name: 'Добавить' }))

    expect(await screen.findByText('Купить хлеб')).toBeInTheDocument()
    expect(screen.getByLabelText('Заголовок новой задачи')).toHaveValue('')
  })

  it('отправляет заданный срок вместе с заголовком', async () => {
    const created = taskJson('Позвонить маме', false, '2026-09-20', '18:00:00')
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(jsonResponse([]))
    fetchMock.mockResolvedValueOnce(jsonResponse(created, 201))
    fetchMock.mockResolvedValueOnce(jsonResponse([created]))

    render(<App />)
    await screen.findByText('Задач пока нет.')

    await userEvent.type(screen.getByLabelText('Заголовок новой задачи'), 'Позвонить маме')
    await pickDate(/20 сентября 2026/)
    await pickTime('18:00')
    await userEvent.click(screen.getByRole('button', { name: 'Добавить' }))

    await screen.findByText('Позвонить маме')

    const [, postCall] = fetchMock.mock.calls
    expect(postCall[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ title: 'Позвонить маме', dueDate: '2026-09-20', dueTime: '18:00' }),
    })
  })

  it('без даты отправляет пустой срок', async () => {
    const created = taskJson('Разобрать шкаф')
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(jsonResponse([]))
    fetchMock.mockResolvedValueOnce(jsonResponse(created, 201))
    fetchMock.mockResolvedValueOnce(jsonResponse([created]))

    render(<App />)
    await screen.findByText('Задач пока нет.')

    await userEvent.type(screen.getByLabelText('Заголовок новой задачи'), 'Разобрать шкаф')
    await userEvent.click(screen.getByRole('button', { name: 'Добавить' }))

    await screen.findByText('Разобрать шкаф')

    const [, postCall] = fetchMock.mock.calls
    expect(postCall[1]).toMatchObject({
      body: JSON.stringify({ title: 'Разобрать шкаф', dueDate: null, dueTime: null }),
    })
  })

  it('не даёт задать время, пока не выбрана дата', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([]))

    render(<App />)
    await screen.findByText('Задач пока нет.')

    expect(screen.getByLabelText('Время срока')).toBeDisabled()

    await pickDate(/20 сентября 2026/)

    expect(screen.getByLabelText('Время срока')).toBeEnabled()
  })

  it('очищает поля срока после создания', async () => {
    const created = taskJson('Сдать отчёт', false, '2026-09-20')
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(jsonResponse([]))
    fetchMock.mockResolvedValueOnce(jsonResponse(created, 201))
    fetchMock.mockResolvedValueOnce(jsonResponse([created]))

    render(<App />)
    await screen.findByText('Задач пока нет.')

    await userEvent.type(screen.getByLabelText('Заголовок новой задачи'), 'Сдать отчёт')
    await pickDate(/20 сентября 2026/)
    await userEvent.click(screen.getByRole('button', { name: 'Добавить' }))

    await screen.findByText('Сдать отчёт')
    expect(screen.getByLabelText('Дата срока')).toHaveTextContent('Срок')
  })

  it('показывает сообщение об ошибке от сервера и не добавляет задачу', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(jsonResponse([]))
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ errors: { title: ['Заголовок задачи не может быть пустым.'] } }, 400),
    )

    render(<App />)
    await screen.findByText('Задач пока нет.')

    await userEvent.type(screen.getByLabelText('Заголовок новой задачи'), 'что-то')
    await userEvent.click(screen.getByRole('button', { name: 'Добавить' }))

    expect(await screen.findByText('Заголовок задачи не может быть пустым.')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Задач пока нет.')).toBeInTheDocument())
  })

  it('не даёт отправить пустой заголовок', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([]))

    render(<App />)
    await screen.findByText('Задач пока нет.')

    expect(screen.getByRole('button', { name: 'Добавить' })).toBeDisabled()

    await userEvent.type(screen.getByLabelText('Заголовок новой задачи'), '   ')
    expect(screen.getByRole('button', { name: 'Добавить' })).toBeDisabled()
  })
})

describe('попап срока', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse([]))
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
  it('отмечает задачу выполненной по клику и запоминает ответ сервера', async () => {
    const task = taskJson('Купить хлеб')
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(jsonResponse([task]))
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...task, isDone: true }))

    render(<App />)

    const checkbox = await screen.findByRole('checkbox', { name: 'Купить хлеб' })
    expect(checkbox).not.toBeChecked()

    await userEvent.click(checkbox)

    expect(await screen.findByRole('checkbox', { name: 'Купить хлеб' })).toBeChecked()

    const [, patchCall] = fetchMock.mock.calls
    expect(patchCall[0]).toBe(`/api/tasks/${task.id}`)
    expect(patchCall[1]).toMatchObject({ method: 'PATCH', body: JSON.stringify({ isDone: true }) })

    // Отметка не меняет порядок ленты, поэтому список не перезапрашивается:
    // два вызова — начальная загрузка и сама отметка.
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('снимает отметку с выполненной задачи', async () => {
    const task = taskJson('Полить цветы', true)
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(jsonResponse([task]))
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...task, isDone: false }))

    render(<App />)

    const checkbox = await screen.findByRole('checkbox', { name: 'Полить цветы' })
    expect(checkbox).toBeChecked()

    await userEvent.click(checkbox)

    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Полить цветы' })).not.toBeChecked())

    const [, patchCall] = fetchMock.mock.calls
    expect(patchCall[1]).toMatchObject({ body: JSON.stringify({ isDone: false }) })
  })

  it('трогает только ту задачу, по которой кликнули', async () => {
    const first = taskJson('Забрать посылку')
    const second = taskJson('Позвонить врачу')
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(jsonResponse([first, second]))
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...first, isDone: true }))

    render(<App />)

    await userEvent.click(await screen.findByRole('checkbox', { name: 'Забрать посылку' }))

    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Забрать посылку' })).toBeChecked())
    expect(screen.getByRole('checkbox', { name: 'Позвонить врачу' })).not.toBeChecked()
  })

  it('не теряет срок задачи при отметке', async () => {
    const task = taskJson('Оплатить счёт', false, TODAY, '12:00:00')
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(jsonResponse([task]))
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...task, isDone: true }))

    render(<App />)

    await userEvent.click(await screen.findByRole('checkbox', { name: 'Оплатить счёт' }))

    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Оплатить счёт' })).toBeChecked())
    expect(screen.getByText('12:00')).toBeInTheDocument()
    expect(screen.getByText('Сегодня')).toBeInTheDocument()
  })

  it('показывает ошибку сервера и оставляет отметку прежней', async () => {
    const task = taskJson('Сдать отчёт')
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(jsonResponse([task]))
    fetchMock.mockResolvedValueOnce(jsonResponse({ title: 'Not Found' }, 404))

    render(<App />)

    await userEvent.click(await screen.findByRole('checkbox', { name: 'Сдать отчёт' }))

    expect(await screen.findByText('Not Found')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Сдать отчёт' })).not.toBeChecked()
  })
})

describe('лента задач', () => {
  it('разделяет задачи по сроку и подписывает состояние', async () => {
    const tasks = [
      taskJson('Просроченная', false, '2026-09-10'),
      taskJson('Сегодняшняя', false, TODAY, '09:30:00'),
      taskJson('Завтрашняя', true, '2026-09-13'),
      taskJson('Бессрочная'),
    ]
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(tasks))

    render(<App />)

    expect(await screen.findByText('Просрочено')).toBeInTheDocument()
    expect(screen.getByText('Сегодня')).toBeInTheDocument()
    expect(screen.getByText('Завтра')).toBeInTheDocument()
    expect(screen.getByText('Без срока')).toBeInTheDocument()
    expect(screen.getByText('09:30')).toBeInTheDocument()
    expect(screen.getByText('Выполнено')).toBeInTheDocument()
  })

  it('у просроченной задачи показывает дату, а не одно время', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse([taskJson('Забытая', false, '2026-09-10', '08:00:00')]),
    )

    render(<App />)

    expect(await screen.findByText('10 сентября, 08:00')).toBeInTheDocument()
  })

  it('у задачи без срока не показывает ни даты, ни времени', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([taskJson('Когда-нибудь')]))

    render(<App />)

    await screen.findByText('Когда-нибудь')
    expect(screen.queryByText('Без срока')).toBeInTheDocument()
    expect(document.querySelector('.task-due')).toBeNull()
  })

  it('считает в шапке невыполненные задачи', async () => {
    const tasks = [
      taskJson('Первая', false, TODAY),
      taskJson('Вторая', false, TODAY),
      taskJson('Третья', true, TODAY),
    ]
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(tasks))

    render(<App />)

    expect(await screen.findByText('Осталось 2 задачи')).toBeInTheDocument()
  })

  it('после отметки последней задачи шапка говорит, что всё выполнено', async () => {
    const task = taskJson('Последняя', false, TODAY)
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(jsonResponse([task]))
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...task, isDone: true }))

    render(<App />)

    await userEvent.click(await screen.findByRole('checkbox', { name: 'Последняя' }))

    expect(await screen.findByText('Все задачи выполнены')).toBeInTheDocument()
  })
})
