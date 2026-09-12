export interface TaskResponse {
  id: string
  title: string
  isDone: boolean
  createdAt: string
  /** Проект задачи либо null, если задача не в проекте. */
  projectId: string | null
  /** День срока «2026-09-20» либо null, если срока нет. */
  dueDate: string | null
  /** Время внутри дня «18:00:00» либо null, если задача на день целиком. */
  dueTime: string | null
}

export interface ProjectResponse {
  id: string
  name: string
  createdAt: string
}

/** Срок, каким его вводит человек в форме: пустая строка означает «не задано». */
export interface DueInput {
  date: string
  time: string
}

/** Тело ответа RFC 7807, которым minimal API отвечает на неверный запрос. */
interface ProblemDetails {
  errors?: Record<string, string[]>
}

/** Текст на случай, когда причина отказа человеку ничего не объясняет. */
export const GENERIC_FAILURE = 'Произошла ошибка. Попробуйте позже.'

/**
 * Сообщение, которое увидит человек. Наружу выходят только тексты проверок API:
 * они написаны по-русски и для человека. Всё остальное — код ответа, служебные
 * заголовки ASP.NET, текст сетевого сбоя — человеку ничего не говорит и заменяется
 * общим текстом.
 */
async function describeFailure(response: Response, fallback: string): Promise<string> {
  try {
    const problem: ProblemDetails = await response.json()
    const fieldError = problem.errors && Object.values(problem.errors).flat()[0]

    return fieldError ?? fallback
  } catch {
    return fallback
  }
}

/** Запрос к API: сетевой сбой доходит до экрана тем же понятным текстом, что и отказ сервера. */
async function request(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init)
  } catch {
    throw new Error(GENERIC_FAILURE)
  }
}

export async function fetchTasks(): Promise<TaskResponse[]> {
  const response = await request('/api/tasks')

  if (!response.ok) {
    throw new Error(await describeFailure(response, 'Не удалось загрузить задачи. Попробуйте позже.'))
  }

  return response.json()
}

export async function createTask(
  title: string,
  due: DueInput,
  projectId: string | null,
): Promise<TaskResponse> {
  const response = await request('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      dueDate: due.date || null,
      // Время без даты API не примет, и посылать его незачем.
      dueTime: (due.date && due.time) || null,
      projectId,
    }),
  })

  if (!response.ok) {
    throw new Error(await describeFailure(response, GENERIC_FAILURE))
  }

  return response.json()
}

export async function setTaskDone(id: string, isDone: boolean): Promise<TaskResponse> {
  const response = await request(`/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isDone }),
  })

  if (!response.ok) {
    throw new Error(await describeFailure(response, GENERIC_FAILURE))
  }

  return response.json()
}

export async function setTaskProject(id: string, projectId: string | null): Promise<TaskResponse> {
  const response = await request(`/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId }),
  })

  if (!response.ok) {
    throw new Error(await describeFailure(response, GENERIC_FAILURE))
  }

  return response.json()
}

export async function fetchProjects(): Promise<ProjectResponse[]> {
  const response = await request('/api/projects')

  if (!response.ok) {
    throw new Error(await describeFailure(response, 'Не удалось загрузить проекты. Попробуйте позже.'))
  }

  return response.json()
}

export async function createProject(name: string): Promise<ProjectResponse> {
  const response = await request('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })

  if (!response.ok) {
    throw new Error(await describeFailure(response, GENERIC_FAILURE))
  }

  return response.json()
}

export async function renameProject(id: string, name: string): Promise<ProjectResponse> {
  const response = await request(`/api/projects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })

  if (!response.ok) {
    throw new Error(await describeFailure(response, GENERIC_FAILURE))
  }

  return response.json()
}

/** Удаление уносит задачи проекта: тело ответа пустое, возвращать нечего. */
export async function deleteProject(id: string): Promise<void> {
  const response = await request(`/api/projects/${id}`, { method: 'DELETE' })

  if (!response.ok) {
    throw new Error(await describeFailure(response, GENERIC_FAILURE))
  }
}
