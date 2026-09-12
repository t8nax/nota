import { useEffect, useMemo, useState } from 'react'
import { createTask, fetchTasks, setTaskDone, type DueInput, type TaskResponse } from './api'
import NewTaskForm from './components/NewTaskForm'
import Sidebar from './components/Sidebar'
import TaskStream from './components/TaskStream'
import { formatMonthTitle } from './dates'
import { plural } from './plural'
import './App.css'

type ListState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; tasks: TaskResponse[] }

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function App() {
  const [list, setList] = useState<ListState>({ status: 'loading' })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  // Отметки переключаются независимо друг от друга, поэтому ждущих запросов может быть несколько.
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set())
  const [toggleError, setToggleError] = useState<string | null>(null)

  const monthTitle = useMemo(() => formatMonthTitle(new Date()), [])

  useEffect(() => {
    let cancelled = false

    fetchTasks()
      .then((tasks) => {
        if (!cancelled) setList({ status: 'ready', tasks })
      })
      .catch((error: unknown) => {
        if (!cancelled) setList({ status: 'error', message: describe(error) })
      })

    return () => {
      cancelled = true
    }
  }, [])

  async function handleCreate(title: string, due: DueInput): Promise<boolean> {
    setSubmitting(true)
    setSubmitError(null)

    try {
      await createTask(title, due)
    } catch (error: unknown) {
      setSubmitError(describe(error))

      return false
    } finally {
      setSubmitting(false)
    }

    // Место новой задачи в ленте задаёт срок, а порядок считает сервер, поэтому
    // список перечитывается целиком, а не достраивается на клиенте.
    try {
      setList({ status: 'ready', tasks: await fetchTasks() })
    } catch (error: unknown) {
      setSubmitError(describe(error))
    }

    return true
  }

  async function handleToggle(task: TaskResponse) {
    if (pending.has(task.id)) return

    setPending((current) => new Set(current).add(task.id))
    setToggleError(null)

    try {
      const updated = await setTaskDone(task.id, !task.isDone)

      setList((current) =>
        current.status === 'ready'
          ? { status: 'ready', tasks: current.tasks.map((t) => (t.id === updated.id ? updated : t)) }
          : current,
      )
    } catch (error: unknown) {
      setToggleError(describe(error))
    } finally {
      setPending((current) => {
        const next = new Set(current)
        next.delete(task.id)

        return next
      })
    }
  }

  const tasks = list.status === 'ready' ? list.tasks : []
  const remaining = tasks.filter((task) => !task.isDone).length

  return (
    <div className="layout">
      <Sidebar />

      <main className="main-stream">
        <div className="header-area">
          <h1 className="current-month">{monthTitle}</h1>
          {tasks.length > 0 && (
            <p className="header-subtitle">
              {remaining === 0
                ? 'Все задачи выполнены'
                : `Осталось ${remaining} ${plural(remaining, { one: 'задача', few: 'задачи', many: 'задач' })}`}
            </p>
          )}
        </div>

        <NewTaskForm submitting={submitting} onSubmit={handleCreate} />

        {submitError && <p className="error">{submitError}</p>}

        {toggleError && <p className="error">{toggleError}</p>}

        {list.status === 'loading' && <p className="hint">Загрузка…</p>}

        {list.status === 'error' && <p className="error">{list.message}</p>}

        {list.status === 'ready' && list.tasks.length === 0 && <p className="hint">Задач пока нет.</p>}

        {list.status === 'ready' && list.tasks.length > 0 && (
          <TaskStream tasks={list.tasks} pending={pending} onToggle={handleToggle} />
        )}
      </main>
    </div>
  )
}

export default App
