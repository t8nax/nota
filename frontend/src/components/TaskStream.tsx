import type { TaskResponse } from '../api'
import { groupByDue } from '../grouping'
import TaskCard from './TaskCard'

interface TaskStreamProps {
  tasks: TaskResponse[]
  pending: ReadonlySet<string>
  onToggle: (task: TaskResponse) => void
}

/** Лента задач: срок — разделитель, под ним карточки этого срока. */
function TaskStream({ tasks, pending, onToggle }: TaskStreamProps) {
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
              onToggle={onToggle}
            />
          ))}
        </section>
      ))}
    </>
  )
}

export default TaskStream
