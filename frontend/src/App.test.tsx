import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

/** Ответ, каким его отдаёт настоящий API. */
function taskJson(title: string, isDone = false) {
  return {
    id: crypto.randomUUID(),
    title,
    isDone,
    createdAt: new Date().toISOString(),
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('форма добавления задачи', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('показывает созданную задачу в списке без перезагрузки', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(jsonResponse([]))
    fetchMock.mockResolvedValueOnce(jsonResponse(taskJson('Купить хлеб'), 201))

    render(<App />)
    await screen.findByText('Задач пока нет.')

    await userEvent.type(screen.getByLabelText('Заголовок новой задачи'), 'Купить хлеб')
    await userEvent.click(screen.getByRole('button', { name: 'Добавить' }))

    expect(await screen.findByText('Купить хлеб')).toBeInTheDocument()

    // Список не перезапрашивается: два вызова — начальная загрузка и создание.
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(screen.getByLabelText('Заголовок новой задачи')).toHaveValue('')
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
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(jsonResponse([]))

    render(<App />)
    await screen.findByText('Задач пока нет.')

    expect(screen.getByRole('button', { name: 'Добавить' })).toBeDisabled()

    await userEvent.type(screen.getByLabelText('Заголовок новой задачи'), '   ')
    expect(screen.getByRole('button', { name: 'Добавить' })).toBeDisabled()
  })
})

describe('отметка выполнения', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

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

    // Список не перезапрашивается: два вызова — начальная загрузка и отметка.
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
