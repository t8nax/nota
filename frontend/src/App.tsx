import { useEffect, useState, type FormEvent } from 'react'
import { createTask, fetchTasks, setTaskDone, type TaskResponse } from './api'
import './App.css'

type ListState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; tasks: TaskResponse[] }

function App() {
  const [list, setList] = useState<ListState>({ status: 'loading' })
  const [title, setTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  // Отметки переключаются независимо друг от друга, поэтому ждущих запросов может быть несколько.
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set())
  const [toggleError, setToggleError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetchTasks()
      .then((tasks) => {
        if (!cancelled) setList({ status: 'ready', tasks })
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setList({ status: 'error', message: error instanceof Error ? error.message : String(error) })
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (submitting) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      const created = await createTask(title)

      // Список отсортирован по времени создания вниз, поэтому новая задача идёт первой.
      setList((current) =>
        current.status === 'ready' ? { status: 'ready', tasks: [created, ...current.tasks] } : current,
      )
      setTitle('')
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : String(error))
    } finally {
      setSubmitting(false)
    }
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
      setToggleError(error instanceof Error ? error.message : String(error))
    } finally {
      setPending((current) => {
        const next = new Set(current)
        next.delete(task.id)
        return next
      })
    }
  }

  return (
    <main className="app">
      <h1>Список дел</h1>

      <form className="new-task" onSubmit={handleSubmit}>
        <input
          className="new-task-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Что нужно сделать?"
          aria-label="Заголовок новой задачи"
          disabled={submitting}
        />
        <button type="submit" disabled={submitting || title.trim().length === 0}>
          {submitting ? 'Добавляю…' : 'Добавить'}
        </button>
      </form>

      {submitError && <p className="error">{submitError}</p>}

      {toggleError && <p className="error">{toggleError}</p>}

      {list.status === 'loading' && <p className="hint">Загрузка…</p>}

      {list.status === 'error' && <p className="error">{list.message}</p>}

      {list.status === 'ready' && list.tasks.length === 0 && <p className="hint">Задач пока нет.</p>}

      {list.status === 'ready' && list.tasks.length > 0 && (
        <ul className="tasks">
          {list.tasks.map((task) => (
            <li key={task.id} className={task.isDone ? 'task done' : 'task'}>
              {/* Заголовок внутри label: он же служит доступным именем для отметки. */}
              <label className="task-label">
                <input
                  type="checkbox"
                  className="marker"
                  checked={task.isDone}
                  disabled={pending.has(task.id)}
                  onChange={() => handleToggle(task)}
                />
                <span className="title">{task.title}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

export default App
