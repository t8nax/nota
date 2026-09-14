import { useEffect, useRef } from 'react'

interface TimePopoverProps {
  /** Выбранное время «18:00» либо пустая строка. */
  value: string
  /** Время набрано руками: попап остаётся открытым. */
  onChange: (time: string) => void
  /** Время выбрано из списка: попап закрывается. */
  onPick: (time: string) => void
}

/** Получасовые слоты суток — ими время задаётся в один клик. */
const SLOTS = Array.from({ length: 48 }, (_, index) => {
  const hour = String(Math.floor(index / 2)).padStart(2, '0')

  return `${hour}:${index % 2 === 0 ? '00' : '30'}`
})

/** Список времени в стиле макета и поле точного ввода под ним.
 * Нативный список `input[type=time]` скрыт стилями: он рисуется браузером. */
function TimePopover({ value, onChange, onPick }: TimePopoverProps) {
  const selected = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    // Список суточный, поэтому выбранное время подтягивается в видимую часть.
    // В jsdom этого метода нет, а тестам прокрутка и не нужна.
    selected.current?.scrollIntoView?.({ block: 'center' })
  }, [])

  return (
    <div className="due-popover time-popover" role="dialog" aria-label="Выбор времени срока">
      <input
        type="time"
        className="time-exact"
        value={value}
        aria-label="Точное время"
        onChange={(event) => onChange(event.target.value)}
      />

      <div className="time-slots">
        {SLOTS.map((slot) => (
          <button
            type="button"
            key={slot}
            ref={slot === value ? selected : undefined}
            className="time-slot"
            aria-pressed={slot === value}
            onClick={() => onPick(slot)}
          >
            {slot}
          </button>
        ))}
      </div>

      {value !== '' && (
        <div className="popover-actions">
          <button type="button" className="popover-action clear" onClick={() => onPick('')}>
            Убрать время
          </button>
        </div>
      )}
    </div>
  )
}

export default TimePopover
