import type { ProjectResponse, TaskResponse } from '../api'
import { groupByDue } from '../grouping'
import TaskCard from './TaskCard'

interface TaskStreamProps {
  tasks: TaskResponse[]
  pending: ReadonlySet<string>
  projects: readonly ProjectResponse[]
  onToggle: (task: TaskResponse) => void
  onMove: (task: TaskResponse, projectId: string | null) => void
}

/** Лента задач: срок — разделитель, под ним карточки этого срока. */
function TaskStream({ tasks, pending, projects, onToggle, onMove }: TaskStreamProps) {
  return (
    <>
      {groupByDue(tasks).map((group) => (
        <section key={group.key}>
          <h2 className={group.overdue ? 'date-divider overdue' : 'date-divider'}>{group.title}</h2>
          {group.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              overdue={group.overdue}
              pending={pending.has(task.id)}
              projects={projects}
              onToggle={onToggle}
              onMove={onMove}
            />
          ))}
        </section>
      ))}
    </>
  )
}

export default TaskStream
