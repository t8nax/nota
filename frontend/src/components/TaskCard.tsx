import type { ProjectResponse, TaskResponse } from '../api'
import { formatShortDay, formatTime } from '../dates'
import ProjectPicker from './ProjectPicker'

interface TaskCardProps {
  task: TaskResponse
  /** Задача из просроченной группы: срок показывается с датой и подсвечен. */
  overdue: boolean
  pending: boolean
  projects: readonly ProjectResponse[]
  onToggle: (task: TaskResponse) => void
  onMove: (task: TaskResponse, projectId: string | null) => void
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
function TaskCard({ task, overdue, pending, projects, onToggle, onMove }: TaskCardProps) {
  const due = dueLabel(task, overdue)

  return (
    <div className="task-card">
      <div className="task-meta">
        {/* Второго состояния у тега нет: выполненная задача с экрана уходит. */}
        <span className="status-tag">В работе</span>
        {due && <span className={overdue ? 'task-due overdue' : 'task-due'}>{due}</span>}

        {/* Пока проектов нет, переносить задачу некуда, и место под чип не занимается. */}
        {projects.length > 0 && (
          <ProjectPicker
            projects={projects}
            value={task.projectId}
            label={`Проект задачи «${task.title}»`}
            disabled={pending}
            onPick={(projectId) => onMove(task, projectId)}
          />
        )}
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
