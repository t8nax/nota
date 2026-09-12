import type { TaskResponse } from '../api'
import { formatTime } from '../dates'

interface TaskCardProps {
  task: TaskResponse
  pending: boolean
  onToggle: (task: TaskResponse) => void
}

/** Карточка ленты: шапка с состоянием и временем, под ней отметка и заголовок. */
function TaskCard({ task, pending, onToggle }: TaskCardProps) {
  return (
    <div className="task-card">
      <div className="task-meta">
        <span className={task.isDone ? 'status-tag done' : 'status-tag'}>
          {task.isDone ? 'Выполнено' : 'В работе'}
        </span>
        <span className="task-time">{formatTime(task.createdAt)}</span>
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
