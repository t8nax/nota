import type { ProjectResponse, TaskResponse } from '../api'
import { dateKey, formatShortDay, formatTime } from '../dates'
import ProjectPicker from './ProjectPicker'

interface TaskCardProps {
  task: TaskResponse
  /** Задача из просроченной группы: срок подсвечен. */
  overdue: boolean
  pending: boolean
  projects: readonly ProjectResponse[]
  onToggle: (task: TaskResponse) => void
  onMove: (task: TaskResponse, projectId: string | null) => void
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
function TaskCard({ task, overdue, pending, projects, onToggle, onMove }: TaskCardProps) {
  const due = dueLabel(task, dateKey(new Date()))

  return (
    <div className="task-item">
      <div className="task-card">
        <div className="task-meta">
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
