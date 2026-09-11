export interface TaskResponse {
  id: string
  title: string
  isDone: boolean
  createdAt: string
}

export async function fetchTasks(): Promise<TaskResponse[]> {
  const response = await fetch('/api/tasks')

  if (!response.ok) {
    throw new Error(`Не удалось получить список задач: ${response.status}`)
  }

  return response.json()
}
