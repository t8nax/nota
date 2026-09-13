import { useEffect, useRef, useState } from 'react'
import type { DueInput } from '../api'
import { dateKey, formatShortDay } from '../dates'
import DatePopover from './DatePopover'
import TimePopover from './TimePopover'

interface DuePickerProps {
  value: DueInput
  disabled: boolean
  onDateChange: (date: string) => void
  onTimeChange: (time: string) => void
}

type OpenedPopover = 'date' | 'time' | null

function chipClass(filled: boolean): string {
  return filled ? 'due-chip filled' : 'due-chip'
}

/** Подпись чипа дня: сегодняшний день назван словом, как группа ленты. */
function dateLabel(date: string): string {
  if (date === '') return 'Срок'

  return date === dateKey(new Date()) ? 'Сегодня' : formatShortDay(date)
}

/** Срок задачи двумя полями со своими попапами: день и время внутри дня. */
function DuePicker({ value, disabled, onDateChange, onTimeChange }: DuePickerProps) {
  const [opened, setOpened] = useState<OpenedPopover>(null)
  const root = useRef<HTMLDivElement>(null)

  // Форма блокируется на время отправки, и попап закрывается вместе с ней: иначе
  // после удачного создания он висел бы над уже пустыми полями. Сброс идёт в рендере,
  // а не эффектом: лишний кадр с открытым попапом над заблокированной формой не нужен.
  if (disabled && opened !== null) setOpened(null)

  useEffect(() => {
    if (opened === null) return

    function handlePointerDown(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpened(null)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpened(null)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [opened])

  function toggle(popover: Exclude<OpenedPopover, null>) {
    setOpened((current) => (current === popover ? null : popover))
  }

  return (
    <div className="new-task-due" ref={root}>
      <div className="due-slot">
        <button
          type="button"
          className={chipClass(value.date !== '')}
          aria-label="Дата срока"
          aria-expanded={opened === 'date'}
          disabled={disabled}
          onClick={() => toggle('date')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <rect x="3" y="4" width="18" height="17" rx="3" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="16" y1="2" x2="16" y2="6" />
          </svg>
          <span>{dateLabel(value.date)}</span>
        </button>

        {opened === 'date' && (
          <DatePopover
            value={value.date}
            onPick={(date) => {
              onDateChange(date)
              setOpened(null)
            }}
          />
        )}
      </div>

      <div className="due-slot">
        <button
          type="button"
          className={chipClass(value.time !== '')}
          aria-label="Время срока"
          aria-expanded={opened === 'time'}
          // Времени без дня не бывает, и API его не примет.
          disabled={disabled || value.date === ''}
          onClick={() => toggle('time')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="12" cy="12" r="9" />
            <polyline points="12 7 12 12 16 14" />
          </svg>
          <span>{value.time === '' ? 'Время' : value.time}</span>
        </button>

        {opened === 'time' && (
          <TimePopover
            value={value.time}
            onChange={onTimeChange}
            onPick={(time) => {
              onTimeChange(time)
              setOpened(null)
            }}
          />
        )}
      </div>
    </div>
  )
}

export default DuePicker
