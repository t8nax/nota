import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

/** Ответ, каким его отдаёт настоящий API. */
function taskJson(title: string) {
  return {
    id: crypto.randomUUID(),
    title,
    isDone: false,
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
