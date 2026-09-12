import { describe, expect, it } from 'vitest'
import { groupByDay } from './grouping'
import type { TaskResponse } from './api'

function task(id: string, createdAt: string): TaskResponse {
  return { id, title: id, isDone: false, createdAt }
}

describe('группировка ленты по дням', () => {
  it('складывает задачи одного дня в одну группу', () => {
    const groups = groupByDay([
      task('поздняя', '2026-09-11T18:00:00'),
      task('ранняя', '2026-09-11T08:30:00'),
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0].tasks.map((t) => t.id)).toEqual(['поздняя', 'ранняя'])
  })

  it('режет список по границе дня, сохраняя порядок', () => {
    const groups = groupByDay([
      task('сегодня', '2026-09-11T09:00:00'),
      task('вчера', '2026-09-10T23:59:00'),
      task('позавчера', '2026-09-09T10:00:00'),
    ])

    expect(groups.map((g) => g.tasks.map((t) => t.id))).toEqual([['сегодня'], ['вчера'], ['позавчера']])
  })

  it('называет группу днём недели и датой', () => {
    const [group] = groupByDay([task('одна', '2026-09-11T09:00:00')])

    expect(group.title).toBe('Пятница, 11 сентября 2026 г.')
  })

  it('на пустом списке не даёт групп', () => {
    expect(groupByDay([])).toEqual([])
  })
})
