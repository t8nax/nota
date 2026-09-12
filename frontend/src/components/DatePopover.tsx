import { useState } from 'react'
import {
  WEEKDAY_LABELS,
  dateKey,
  formatFullDay,
  formatMonthTitle,
  monthGrid,
  monthKey,
  parseDateKey,
  shiftDays,
  shiftMonths,
} from '../dates'

interface DatePopoverProps {
  /** Выбранный день «2026-09-20» либо пустая строка. */
  value: string
  onPick: (date: string) => void
}

function dayClass(key: string, value: string, todayKey: string, shownMonth: string): string {
  const names = ['cal-date']

  if (monthKey(parseDateKey(key)) !== shownMonth) names.push('outside')
  if (key === todayKey) names.push('today')
  if (key === value) names.push('selected')

  return names.join(' ')
}

/** Календарь месяца в стиле макета. Свой, а не нативный попап `input[type=date]`:
 * тот рисуется браузером и под тёмную тему приложения не стилизуется. */
function DatePopover({ value, onPick }: DatePopoverProps) {
  const today = new Date()
  const todayKey = dateKey(today)
  // Открывается на месяце выбранного дня, а без выбора — на текущем.
  const [shown, setShown] = useState(() => (value === '' ? today : parseDateKey(value)))

  const shownMonth = monthKey(shown)

  return (
    <div className="due-popover date-popover" role="dialog" aria-label="Выбор даты срока">
      <div className="popover-head">
        <button
          type="button"
          className="popover-nav"
          aria-label="Предыдущий месяц"
          onClick={() => setShown(shiftMonths(shown, -1))}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="popover-title">{formatMonthTitle(shown)}</span>
        <button
          type="button"
          className="popover-nav"
          aria-label="Следующий месяц"
          onClick={() => setShown(shiftMonths(shown, 1))}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <div className="mini-calendar">
        {WEEKDAY_LABELS.map((label) => (
          <span className="cal-day-label" key={label}>
            {label}
          </span>
        ))}
        {monthGrid(shown).map((key) => (
          <button
            type="button"
            key={key}
            className={dayClass(key, value, todayKey, shownMonth)}
            aria-label={formatFullDay(key)}
            aria-pressed={key === value}
            onClick={() => onPick(key)}
          >
            {parseDateKey(key).getDate()}
          </button>
        ))}
      </div>

      <div className="popover-actions">
        <button type="button" className="popover-action" onClick={() => onPick(todayKey)}>
          Сегодня
        </button>
        <button type="button" className="popover-action" onClick={() => onPick(dateKey(shiftDays(today, 1)))}>
          Завтра
        </button>
        {value !== '' && (
          <button type="button" className="popover-action clear" onClick={() => onPick('')}>
            Убрать
          </button>
        )}
      </div>
    </div>
  )
}

export default DatePopover
