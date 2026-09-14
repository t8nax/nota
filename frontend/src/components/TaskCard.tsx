import { useState } from 'react'
import type { ProjectResponse, TaskResponse } from '../api'
import { dateKey, formatShortDay, formatTime } from '../dates'
import { useDismiss } from '../useDismiss'
import DatePopover from './DatePopover'
import ProjectPicker from './ProjectPicker'

interface TaskCardProps {
  task: TaskResponse
  /** Задача из просроченной группы: срок подсвечен. */
  overdue: boolean
  pending: boolean
  /** Задача открыта в окне правки: полоска слева горит, как при наведении. */
  editing: boolean
  projects: readonly ProjectResponse[]
  onToggle: (task: TaskResponse) => void
  onMove: (task: TaskResponse, projectId: string | null) => void
  onEdit: (task: TaskResponse) => void
  onDueDateChange: (task: TaskResponse, dueDate: string) => void
}

/** Срок над заголовком. У сегодняшней задачи день и так понятен, остаётся время;
 * у любой другой день пишется: в группе дальнего дня он совпадает с заголовком,
 * а в просроченной группе без него непонятно, насколько давно. */
function dueLabel(task: TaskResponse, today: string): string | null {
  if (task.dueDate === null) return null

  const time = task.dueTime === null ? null : formatTime(task.dueTime)

  if (task.dueDate === today) return time

  return time === null ? formatShortDay(task.dueDate) : `${formatShortDay(task.dueDate)}, ${time}`
}

/** Задача в ленте: карточка со сроком, отметкой и заголовком, справа от неё чип проекта. */
function TaskCard({ task, overdue, pending, editing, projects, onToggle, onMove, onEdit, onDueDateChange }: TaskCardProps) {
  const [calendarOpened, setCalendarOpened] = useState(false)
  const dueSlot = useDismiss<HTMLDivElement>(calendarOpened, () => setCalendarOpened(false))

  if (pending && calendarOpened) setCalendarOpened(false)

  const due = dueLabel(task, dateKey(new Date()))
  // Без подписи кнопка срока проявляется только при наведении. У сегодняшней задачи
  // без времени подписи нет, но срок есть, и кнопка называет его словом.
  const quietLabel = task.dueDate === null ? 'Срок' : 'Сегодня'

  const dueClasses = ['task-due', overdue ? 'overdue' : '', due === null ? 'quiet' : '']

  return (
    <div className="task-item">
      <div className={editing ? 'task-card editing' : 'task-card'}>
        {/* Без подписи строка срока схлопнута: места над заголовком она не занимает
            и раскрывается с кнопкой только под курсором, с фокусом или открытым календарём. */}
        <div className={due === null ? 'task-meta quiet' : 'task-meta'}>
          <div className="due-slot" ref={dueSlot}>
            <button
              type="button"
              className={dueClasses.join(' ').trim()}
              aria-expanded={calendarOpened}
              disabled={pending}
              onClick={() => setCalendarOpened((current) => !current)}
            >
              {due ?? quietLabel}
            </button>

            {calendarOpened && (
              <DatePopover
                value={task.dueDate ?? ''}
                onPick={(date) => {
                  setCalendarOpened(false)
                  onDueDateChange(task, date)
                }}
              />
            )}
          </div>
        </div>

        <div className="task-content">
          {/* Отметка названа заголовком: клик по самому заголовку открывает правку. */}
          <input
            type="checkbox"
            className="checkbox"
            aria-label={task.title}
            checked={task.isDone}
            disabled={pending}
            onChange={() => onToggle(task)}
          />
          <button type="button" className="task-text" onClick={() => onEdit(task)}>
            {task.title}
          </button>
        </div>
      </div>

      {/* Пока проектов нет, переносить задачу некуда, и чипа нет. */}
      {projects.length > 0 && (
        <div className="task-project">
          <ProjectPicker
            projects={projects}
            value={task.projectId}
            label={`Проект задачи «${task.title}»`}
            disabled={pending}
            align="right"
            onPick={(projectId) => onMove(task, projectId)}
          />
        </div>
      )}
    </div>
  )
}

export default TaskCard
