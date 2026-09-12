import type { TaskResponse } from './api'
import { dayKey, formatDayTitle } from './dates'

export interface DayGroup {
  key: string
  title: string
  tasks: TaskResponse[]
}

/** Режет отсортированный список на дни создания, сохраняя порядок задач. */
export function groupByDay(tasks: TaskResponse[]): DayGroup[] {
  const groups: DayGroup[] = []

  for (const task of tasks) {
    const key = dayKey(task.createdAt)
    const last = groups.at(-1)

    if (last?.key === key) {
      last.tasks.push(task)
    } else {
      groups.push({ key, title: formatDayTitle(task.createdAt), tasks: [task] })
    }
  }

  return groups
}
