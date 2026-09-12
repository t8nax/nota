import type { TaskResponse } from '../api'
import { formatShortDay, formatTime } from '../dates'

interface TaskCardProps {
  task: TaskResponse
  /** Задача из просроченной группы: срок показывается с датой и подсвечен. */
  overdue: boolean
  pending: boolean
  onToggle: (task: TaskResponse) => void
}

/** Срок в шапке карточки. День берётся из заголовка группы, кроме просроченных:
 * там в одной группе лежат разные дни, и без даты непонятно, насколько давно. */
function dueLabel(task: TaskResponse, overdue: boolean): string | null {
  if (task.dueDate === null) return null

  const time = task.dueTime === null ? null : formatTime(task.dueTime)

  if (!overdue) return time

  return time === null ? formatShortDay(task.dueDate) : `${formatShortDay(task.dueDate)}, ${time}`
}

/** Карточка ленты: шапка с состоянием и сроком, под ней отметка и заголовок. */
function TaskCard({ task, overdue, pending, onToggle }: TaskCardProps) {
  const due = dueLabel(task, overdue)

  return (
    <div className="task-card">
      <div className="task-meta">
        {/* Второго состояния у тега нет: выполненная задача с экрана уходит. */}
        <span className="status-tag">В работе</span>
        {due && <span className={overdue ? 'task-due overdue' : 'task-due'}>{due}</span>}
      </div>

      {/* Заголовок внутри label: он же служит доступным именем для отметки. */}
      <label className="task-content">
        <input
          type="checkbox"
          className="checkbox"
          checked={task.isDone}
          disabled={pending}
          onChange={() => onToggle(task)}
        />
        <span className="task-text">{task.title}</span>
      </label>
    </div>
  )
}

export default TaskCard
