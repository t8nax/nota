import { describe, expect, it } from 'vitest'
import { groupByDue } from './grouping'
import type { TaskResponse } from './api'

const NOW = new Date(2026, 8, 12, 10, 0)

function task(id: string, dueDate: string | null = null, dueTime: string | null = null): TaskResponse {
  return { id, title: id, isDone: false, createdAt: '2026-09-01T10:00:00', dueDate, dueTime }
}

describe('группировка ленты по сроку', () => {
  it('называет группы сегодняшнего и завтрашнего дня словами', () => {
    const groups = groupByDue([task('сегодня', '2026-09-12'), task('завтра', '2026-09-13')], NOW)

    expect(groups.map((g) => g.title)).toEqual(['Сегодня', 'Завтра'])
  })

  it('дальние дни подписывает днём недели и датой', () => {
    const [group] = groupByDue([task('через неделю', '2026-09-19')], NOW)

    expect(group.title).toBe('Суббота, 19 сентября 2026 г.')
  })

  it('сливает все прошедшие дни в одну просроченную группу', () => {
    const groups = groupByDue([task('позавчера', '2026-09-10'), task('вчера', '2026-09-11')], NOW)

    expect(groups).toHaveLength(1)
    expect(groups[0].title).toBe('Просрочено')
    expect(groups[0].overdue).toBe(true)
    expect(groups[0].tasks.map((t) => t.id)).toEqual(['позавчера', 'вчера'])
  })

  it('задачи без срока собирает в отдельную группу', () => {
    const groups = groupByDue([task('со сроком', '2026-09-12'), task('без срока')], NOW)

    expect(groups.map((g) => g.title)).toEqual(['Сегодня', 'Без срока'])
    expect(groups[1].overdue).toBe(false)
  })

  it('сохраняет порядок задач внутри дня', () => {
    const groups = groupByDue(
      [task('весь день', '2026-09-12'), task('утром', '2026-09-12', '09:00:00')],
      NOW,
    )

    expect(groups[0].tasks.map((t) => t.id)).toEqual(['весь день', 'утром'])
  })

  it('на пустом списке не даёт групп', () => {
    expect(groupByDue([], NOW)).toEqual([])
  })
})
