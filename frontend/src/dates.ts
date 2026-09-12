/** Форматирование дат ленты. Раскладка русская: месяц с заглавной, время 24-часовое. */

const monthTitleFormat = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' })
const dayTitleFormat = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const shortDayFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/** «Сентябрь 2026» — крупный заголовок ленты. */
export function formatMonthTitle(date: Date): string {
  return capitalize(monthTitleFormat.format(date))
}

/** Ключ дня «2026-09-11» в местном времени: им лента режется на группы. */
export function dateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${date.getFullYear()}-${month}-${day}`
}

/** День, сдвинутый на несколько суток от заданного. */
export function shiftDays(date: Date, days: number): Date {
  const shifted = new Date(date)
  shifted.setDate(shifted.getDate() + days)

  return shifted
}

/** Разбирает «2026-09-11» в местный полдень.
 * Через `new Date(iso)` такая строка читается как полночь UTC и в западных
 * часовых поясах съезжает на день назад. */
function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)

  return new Date(year, month - 1, day, 12)
}

/** «Пятница, 11 сентября 2026 г.» — разделитель дня по ключу срока. */
export function formatDayTitle(key: string): string {
  return capitalize(dayTitleFormat.format(parseDateKey(key)))
}

/** «11 сентября» — дата в карточке, когда одного заголовка группы мало. */
export function formatShortDay(key: string): string {
  return shortDayFormat.format(parseDateKey(key))
}

/** «18:00» — время срока. API отдаёт его с секундами, показывать их незачем. */
export function formatTime(value: string): string {
  return value.slice(0, 5)
}
