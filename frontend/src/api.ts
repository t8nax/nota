export interface TaskResponse {
  id: string
  title: string
  isDone: boolean
  createdAt: string
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

export async function createTask(title: string): Promise<TaskResponse> {
  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
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
