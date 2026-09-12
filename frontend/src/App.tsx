import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createTask,
  fetchTasks,
  GENERIC_FAILURE,
  setTaskDone,
  type DueInput,
  type TaskResponse,
} from './api'
import ErrorToasts, { type ErrorToast } from './components/ErrorToasts'
import NewTaskForm from './components/NewTaskForm'
import Sidebar from './components/Sidebar'
import TaskStream from './components/TaskStream'
import { formatMonthTitle, formatTodaySubtitle } from './dates'
import { filterForView, type ViewId } from './grouping'
import { plural } from './plural'
import './App.css'

type ListState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; tasks: TaskResponse[] }

/** Тексты для человека складывает `api.ts`; всё остальное сюда доходить не должно. */
function describe(error: unknown): string {
  return error instanceof Error ? error.message : GENERIC_FAILURE
}

function App() {
  const [list, setList] = useState<ListState>({ status: 'loading' })
  const [submitting, setSubmitting] = useState(false)
  // Отметки переключаются независимо друг от друга, поэтому ждущих запросов может быть несколько.
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set())
  const [toasts, setToasts] = useState<readonly ErrorToast[]>([])
  const [view, setView] = useState<ViewId>('all')
  const lastToastId = useRef(0)

  // Один момент времени на всю шапку: заголовок и подпись дня не должны разъехаться.
  const openedAt = useMemo(() => new Date(), [])
  const monthTitle = useMemo(() => formatMonthTitle(openedAt), [openedAt])

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  function showError(error: unknown) {
    lastToastId.current += 1
    setToasts((current) => [...current, { id: lastToastId.current, message: describe(error) }])
  }

  useEffect(() => {
    let cancelled = false

    fetchTasks()
      .then((tasks) => {
        if (!cancelled) setList({ status: 'ready', tasks })
      })
      .catch((error: unknown) => {
        // Первая загрузка оставляет экран пустым, поэтому её отказ живёт в теле ленты:
        // исчезнувший попап оставил бы человека перед пустотой без объяснения.
        if (!cancelled) setList({ status: 'error', message: describe(error) })
      })

    return () => {
      cancelled = true
    }
  }, [])

  async function handleCreate(title: string, due: DueInput): Promise<boolean> {
    setSubmitting(true)

    try {
      await createTask(title, due)
    } catch (error: unknown) {
      showError(error)

      return false
    } finally {
      setSubmitting(false)
    }

    // Место новой задачи в ленте задаёт срок, а порядок считает сервер, поэтому
    // список перечитывается целиком, а не достраивается на клиенте.
    try {
      setList({ status: 'ready', tasks: await fetchTasks() })
    } catch (error: unknown) {
      showError(error)
    }

    return true
  }

  async function handleToggle(task: TaskResponse) {
    if (pending.has(task.id)) return

    setPending((current) => new Set(current).add(task.id))

    try {
      const updated = await setTaskDone(task.id, !task.isDone)

      setList((current) =>
        current.status === 'ready'
          ? { status: 'ready', tasks: current.tasks.map((t) => (t.id === updated.id ? updated : t)) }
          : current,
      )
    } catch (error: unknown) {
      showError(error)
    } finally {
      setPending((current) => {
        const next = new Set(current)
        next.delete(task.id)

        return next
      })
    }
  }

  // Экран решает, какие задачи видны; счётчик и пустое состояние считают по ним же.
  const visible = filterForView(list.status === 'ready' ? list.tasks : [], view)
  const remaining = visible.filter((task) => !task.isDone).length
  const countLine =
    visible.length === 0
      ? null
      : remaining === 0
        ? 'Все задачи выполнены'
        : `Осталось ${remaining} ${plural(remaining, { one: 'задача', few: 'задачи', many: 'задач' })}`
  // Макет этого экрана не рисовал: день подписан в его стиле, но не по нему.
  const subtitle = [view === 'today' ? formatTodaySubtitle(openedAt) : null, countLine]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="layout">
      <Sidebar view={view} onSelect={setView} />

      <main className="main-stream">
        <div className="header-area">
          <h1 className="current-month">{view === 'today' ? 'Сегодня' : monthTitle}</h1>
          {subtitle.length > 0 && <p className="header-subtitle">{subtitle}</p>}
        </div>

        <NewTaskForm submitting={submitting} onSubmit={handleCreate} />

        {list.status === 'loading' && <p className="hint">Загрузка…</p>}

        {list.status === 'error' && <p className="error">{list.message}</p>}

        {list.status === 'ready' && visible.length === 0 && (
          <p className="hint">{view === 'today' ? 'На сегодня задач нет.' : 'Задач пока нет.'}</p>
        )}

        {list.status === 'ready' && visible.length > 0 && (
          <TaskStream tasks={visible} pending={pending} onToggle={handleToggle} />
        )}
      </main>

      <ErrorToasts toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}

export default App
