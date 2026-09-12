import type { TaskResponse } from '../api'
import { groupByDay } from '../grouping'
import TaskCard from './TaskCard'

interface TaskStreamProps {
  tasks: TaskResponse[]
  pending: ReadonlySet<string>
  onToggle: (task: TaskResponse) => void
}

/** Лента задач: день — разделитель, под ним карточки этого дня. */
function TaskStream({ tasks, pending, onToggle }: TaskStreamProps) {
  return (
    <>
      {groupByDay(tasks).map((group) => (
        <section key={group.key}>
          <h2 className="date-divider">{group.title}</h2>
          {group.tasks.map((task) => (
            <TaskCard key={task.id} task={task} pending={pending.has(task.id)} onToggle={onToggle} />
          ))}
        </section>
      ))}
    </>
  )
}

export default TaskStream
