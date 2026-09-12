/** Форматирование дат ленты. Раскладка русская: месяц с заглавной, время 24-часовое. */

const monthTitleFormat = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' })
const dayTitleFormat = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const timeFormat = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/** «Сентябрь 2026» — крупный заголовок ленты. */
export function formatMonthTitle(date: Date): string {
  return capitalize(monthTitleFormat.format(date))
}

/** «Пятница, 11 сентября 2026» — разделитель дня. */
export function formatDayTitle(iso: string): string {
  return capitalize(dayTitleFormat.format(new Date(iso)))
}

/** «14:30» — время в шапке карточки. */
export function formatTime(iso: string): string {
  return timeFormat.format(new Date(iso))
}

/** Ключ дня в локальном времени: по нему лента режется на группы. */
export function dayKey(iso: string): string {
  const date = new Date(iso)

  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}
