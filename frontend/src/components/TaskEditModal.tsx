import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { ProjectResponse, TaskEdit, TaskResponse } from '../api'
import { dateKey, formatShortDay, formatTime, shiftDays } from '../dates'
import DatePopover from './DatePopover'
import ProjectPopover, { NO_PROJECT } from './ProjectPopover'
import TimePopover from './TimePopover'

interface TaskEditModalProps {
  task: TaskResponse
  projects: readonly ProjectResponse[]
  /** Запрос сохранения ушёл: повторно его не отправить. */
  saving: boolean
  onSave: (edit: TaskEdit) => void
  onDelete: () => void
  onClose: () => void
}

type OpenedPopover = 'project' | 'date' | 'time' | null

/** Сегодня и завтра пишутся словом: так же названы группы ленты. */
function dateLabel(date: string): string {
  if (date === '') return 'Без срока'

  const today = new Date()

  if (date === dateKey(today)) return 'Сегодня'
  if (date === dateKey(shiftDays(today, 1))) return 'Завтра'

  return formatShortDay(date)
}

interface PickerFieldProps {
  id: string
  label: string
  value: string
  filled: boolean
  opened: boolean
  disabled?: boolean
  icon: ReactNode
  onToggle: () => void
  children: ReactNode
}

/** Поле окна, которое не набирается, а выбирается попапом под ним. */
function PickerField({ id, label, value, filled, opened, disabled = false, icon, onToggle, children }: PickerFieldProps) {
  return (
    <div className="edit-field">
      <span className="edit-label" id={`${id}-label`}>
        {label}
      </span>
      <div className="edit-slot" data-slot={id}>
        <button
          type="button"
          id={id}
          className={['edit-input', 'edit-picker', filled ? 'filled' : '', opened ? 'open' : ''].join(' ').trim()}
          aria-labelledby={`${id}-label ${id}-value`}
          aria-expanded={opened}
          disabled={disabled}
          onClick={onToggle}
        >
          <span id={`${id}-value`} className="edit-value">
            {value}
          </span>
          <span className="edit-icon" aria-hidden="true">
            {icon}
          </span>
        </button>
        {opened && children}
      </div>
    </div>
  )
}

/**
 * Окно правки задачи. Правки живут в черновике и уходят только по «Сохранить»:
 * крестик, клик по затемнению и Escape закрывают окно, не трогая задачу.
 */
function TaskEditModal({ task, projects, saving, onSave, onDelete, onClose }: TaskEditModalProps) {
  const [title, setTitle] = useState(task.title)
  const [date, setDate] = useState(task.dueDate ?? '')
  const [time, setTime] = useState(task.dueTime === null ? '' : formatTime(task.dueTime))
  const [projectId, setProjectId] = useState(task.projectId)
  const [opened, setOpened] = useState<OpenedPopover>(null)
  const dialog = useRef<HTMLDivElement>(null)
  // Свежие обработчики без переподписки слушателей на каждый рендер.
  const latest = useRef({ opened, onClose })

  useEffect(() => {
    latest.current = { opened, onClose }
  })

  useEffect(() => {
    // Фокус уходит в окно: попапы формы и календарь ленты закрываются уходом фокуса.
    dialog.current?.focus()

    // Escape при открытом попапе закрывает только попап, а окно — лишь следующим нажатием.
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return

      event.stopPropagation()

      if (latest.current.opened !== null) {
        setOpened(null)
      } else {
        latest.current.onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)

    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [])

  /** Клик или фокус внутри окна, но мимо поля с открытым попапом, закрывает только попап. */
  function closePopoverOutside(target: EventTarget) {
    if (opened === null) return

    const slot = dialog.current?.querySelector(`[data-slot="edit-${opened}"]`)

    if (!slot?.contains(target as Node)) setOpened(null)
  }

  function toggle(popover: Exclude<OpenedPopover, null>) {
    setOpened((current) => (current === popover ? null : popover))
  }

  const canSave = title.trim().length > 0 && !saving

  function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (!canSave) return

    // Без дня время теряет смысл и сбрасывается вместе с ним.
    onSave({ title, due: { date, time: date === '' ? '' : time }, projectId })
  }

  const project = projects.find((candidate) => candidate.id === projectId)

  return (
    <div
      className="modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialog}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-heading"
        tabIndex={-1}
        onPointerDown={(event) => closePopoverOutside(event.target)}
        onFocus={(event) => closePopoverOutside(event.target)}
      >
        <form onSubmit={handleSubmit}>
          <div className="modal-head">
            <h2 id="edit-heading" className="modal-title">
              Правка задачи
            </h2>
            <button type="button" className="modal-close" aria-label="Закрыть окно" onClick={onClose}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </button>
          </div>

          <div className="edit-fields">
            <div className="edit-field">
              <label className="edit-label" htmlFor="edit-title">
                Заголовок
              </label>
              <input
                id="edit-title"
                className={title === '' ? 'edit-input' : 'edit-input filled'}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>

            <PickerField
              id="edit-project"
              label="Проект"
              value={project?.name ?? NO_PROJECT}
              filled={project !== undefined}
              opened={opened === 'project'}
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              }
              onToggle={() => toggle('project')}
            >
              <ProjectPopover
                projects={projects}
                value={projectId}
                label="Выбор проекта"
                className="due-popover project-popover"
                onPick={(picked) => {
                  setProjectId(picked)
                  setOpened(null)
                }}
              />
            </PickerField>

            <div className="edit-row">
              <PickerField
                id="edit-date"
                label="Дата"
                value={dateLabel(date)}
                filled={date !== ''}
                opened={opened === 'date'}
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <rect x="3" y="4" width="18" height="17" rx="3" />
                    <line x1="3" y1="9" x2="21" y2="9" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                  </svg>
                }
                onToggle={() => toggle('date')}
              >
                <DatePopover
                  value={date}
                  onPick={(picked) => {
                    setDate(picked)
                    setOpened(null)
                  }}
                />
              </PickerField>

              <PickerField
                id="edit-time"
                label="Время"
                value={date !== '' && time !== '' ? time : 'Не задано'}
                filled={date !== '' && time !== ''}
                opened={opened === 'time'}
                // Времени без дня не бывает.
                disabled={date === ''}
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <circle cx="12" cy="12" r="9" />
                    <polyline points="12 7 12 12 16 14" />
                  </svg>
                }
                onToggle={() => toggle('time')}
              >
                <TimePopover
                  value={time}
                  onChange={setTime}
                  onPick={(picked) => {
                    setTime(picked)
                    setOpened(null)
                  }}
                />
              </PickerField>
            </div>
          </div>

          <div className="modal-footer">
            <button type="submit" className="modal-save" disabled={!canSave}>
              Сохранить
            </button>
            <button type="button" className="modal-delete" aria-label="Удалить задачу" onClick={onDelete}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TaskEditModal
