export interface TaskResponse {
  id: string
  title: string
  isDone: boolean
  createdAt: string
  /** День срока «2026-09-20» либо null, если срока нет. */
  dueDate: string | null
  /** Время внутри дня «18:00:00» либо null, если задача на день целиком. */
  dueTime: string | null
}

/** Срок, каким его вводит человек в форме: пустая строка означает «не задано». */
export interface DueInput {
  date: string
  time: string
}

/** Тело ответа RFC 7807, которым minimal API отвечает на неверный запрос. */
interface ProblemDetails {
  title?: string
  detail?: string
  errors?: Record<string, string[]>
}

/** Достаёт из ответа сообщение, которое не стыдно показать пользователю. */
async function describeFailure(response: Response, fallback: string): Promise<string> {
  try {
    const problem: ProblemDetails = await response.json()
    const fieldError = problem.errors && Object.values(problem.errors).flat()[0]

    return fieldError ?? problem.detail ?? problem.title ?? `${fallback}: ${response.status}`
  } catch {
    return `${fallback}: ${response.status}`
  }
}

export async function fetchTasks(): Promise<TaskResponse[]> {
  const response = await fetch('/api/tasks')

  if (!response.ok) {
    throw new Error(await describeFailure(response, 'Не удалось получить список задач'))
  }

  return response.json()
}

export async function createTask(title: string, due: DueInput): Promise<TaskResponse> {
  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      dueDate: due.date || null,
      // Время без даты API не примет, и посылать его незачем.
      dueTime: (due.date && due.time) || null,
    }),
  })

  if (!response.ok) {
    throw new Error(await describeFailure(response, 'Не удалось создать задачу'))
  }

  return response.json()
}

export async function setTaskDone(id: string, isDone: boolean): Promise<TaskResponse> {
  const response = await fetch(`/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isDone }),
  })

  if (!response.ok) {
    throw new Error(await describeFailure(response, 'Не удалось изменить отметку'))
  }

  return response.json()
}
