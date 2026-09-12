import type { TaskResponse } from './api'
import { dateKey, formatDayTitle, shiftDays } from './dates'

export interface DueGroup {
  key: string
  title: string
  /** Срок прошёл: группа и карточки в ней подсвечиваются иначе. */
  overdue: boolean
  tasks: TaskResponse[]
}

/** Что стоит в заголовке группы вместо даты. */
const NAMED_TITLES: Record<string, string> = {
  overdue: 'Просрочено',
  today: 'Сегодня',
  tomorrow: 'Завтра',
  none: 'Без срока',
}

/** К какой группе относится задача. Все просроченные дни сливаются в одну. */
function groupKeyOf(task: TaskResponse, today: string, tomorrow: string): string {
  if (task.dueDate === null) return 'none'
  if (task.dueDate < today) return 'overdue'
  if (task.dueDate === today) return 'today'
  if (task.dueDate === tomorrow) return 'tomorrow'

  return task.dueDate
}

/**
 * Режет список на группы срока, сохраняя порядок задач: список приходит от API
 * уже отсортированным по сроку, и фронт этот порядок не пересобирает.
 */
export function groupByDue(tasks: TaskResponse[], now: Date = new Date()): DueGroup[] {
  const today = dateKey(now)
  const tomorrow = dateKey(shiftDays(now, 1))
  const groups: DueGroup[] = []

  for (const task of tasks) {
    const key = groupKeyOf(task, today, tomorrow)
    const last = groups.at(-1)

    if (last?.key === key) {
      last.tasks.push(task)
    } else {
      groups.push({
        key,
        title: NAMED_TITLES[key] ?? formatDayTitle(key),
        overdue: key === 'overdue',
        tasks: [task],
      })
    }
  }

  return groups
}
