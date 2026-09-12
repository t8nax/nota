import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createProject,
  createTask,
  deleteProject,
  fetchProjects,
  fetchTasks,
  GENERIC_FAILURE,
  renameProject,
  setTaskDone,
  setTaskProject,
  type DueInput,
  type ProjectResponse,
  type TaskResponse,
} from './api'
import NewTaskForm from './components/NewTaskForm'
import Sidebar from './components/Sidebar'
import TaskStream from './components/TaskStream'
import Toasts, { type ToastData } from './components/Toasts'
import { formatMonthTitle, formatTodaySubtitle } from './dates'
import { filterForView, type View } from './grouping'
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
  const [toasts, setToasts] = useState<readonly ToastData[]>([])
  const [projects, setProjects] = useState<readonly ProjectResponse[]>([])
  const [view, setView] = useState<View>({ kind: 'all' })
  const lastToastId = useRef(0)
  // Список приходит от сервера целиком, и ответ запроса, ушедшего раньше, может
  // вернуться позже: применить его значило бы показать ленту такой, какой она была
  // до создания задачи. Поэтому применяется только ответ последнего запроса.
  const lastListRequest = useRef(0)

  // Один момент времени на всю шапку: заголовок и подпись дня не должны разъехаться.
  const openedAt = useMemo(() => new Date(), [])
  const monthTitle = useMemo(() => formatMonthTitle(openedAt), [openedAt])

  /** Отмечает уходящий запрос списка; вернёт проверку «этот ответ ещё свежий». */
  const startListRequest = useCallback(() => {
    const request = (lastListRequest.current += 1)

    return () => request === lastListRequest.current
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  function showToast(toast: Omit<ToastData, 'id'>) {
    lastToastId.current += 1
    setToasts((current) => [...current, { ...toast, id: lastToastId.current }])
  }

  function showError(error: unknown) {
    showToast({ message: describe(error), tone: 'error' })
  }

  useEffect(() => {
    const isFresh = startListRequest()

    fetchTasks()
      .then((tasks) => {
        if (isFresh()) setList({ status: 'ready', tasks })
      })
      .catch((error: unknown) => {
        // Первая загрузка оставляет экран пустым, поэтому её отказ живёт в теле ленты:
        // исчезнувший попап оставил бы человека перед пустотой без объяснения.
        if (isFresh()) setList({ status: 'error', message: describe(error) })
      })
  }, [startListRequest])

  useEffect(() => {
    // Отказ списка проектов не гасит ленту: она грузится своим запросом и своим
    // сообщением об ошибке, а левая колонка остаётся без раздела проектов.
    fetchProjects()
      .then(setProjects)
      .catch((error: unknown) => {
        showError(error)
      })
    // Проекты читаются один раз при открытии: дальше их правит сам экран.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCreate(
    title: string,
    due: DueInput,
    projectId: string | null,
  ): Promise<boolean> {
    setSubmitting(true)

    try {
      await createTask(title, due, projectId)
    } catch (error: unknown) {
      showError(error)

      return false
    } finally {
      setSubmitting(false)
    }

    // Место новой задачи в ленте задаёт срок, а порядок считает сервер, поэтому
    // список перечитывается целиком, а не достраивается на клиенте.
    const isFresh = startListRequest()

    try {
      const tasks = await fetchTasks()

      if (isFresh()) setList({ status: 'ready', tasks })
    } catch (error: unknown) {
      if (isFresh()) showError(error)
    }

    return true
  }

  async function handleCreateProject(name: string): Promise<boolean> {
    try {
      const project = await createProject(name)

      // Порядок списка — порядок заведения, поэтому новый проект встаёт в конец.
      setProjects((current) => [...current, project])

      return true
    } catch (error: unknown) {
      showError(error)

      return false
    }
  }

  async function handleRenameProject(id: string, name: string): Promise<boolean> {
    try {
      const updated = await renameProject(id, name)

      setProjects((current) => current.map((project) => (project.id === id ? updated : project)))

      return true
    } catch (error: unknown) {
      showError(error)

      return false
    }
  }

  async function handleDeleteProject(id: string) {
    try {
      await deleteProject(id)
    } catch (error: unknown) {
      showError(error)

      return
    }

    setProjects((current) => current.filter((project) => project.id !== id))

    // Задачи удалённого проекта ушли вместе с ним, и порядок остальных от этого не
    // меняется: список чистится на месте, а не перечитывается.
    setList((current) =>
      current.status === 'ready'
        ? { status: 'ready', tasks: current.tasks.filter((task) => task.projectId !== id) }
        : current,
    )

    // Экран удалённого проекта показывать нечего.
    setView((current) =>
      current.kind === 'project' && current.projectId === id ? { kind: 'all' } : current,
    )
  }

  async function applyDone(task: TaskResponse, isDone: boolean) {
    if (pending.has(task.id)) return

    setPending((current) => new Set(current).add(task.id))

    try {
      const updated = await setTaskDone(task.id, isDone)

      setList((current) =>
        current.status === 'ready'
          ? { status: 'ready', tasks: current.tasks.map((t) => (t.id === updated.id ? updated : t)) }
          : current,
      )

      // Выполненная задача уходит с экрана, и вернуть её можно только этим попапом:
      // карточки с отметкой в ленте больше нет, а списка выполненных пока нет вовсе.
      if (updated.isDone) {
        showToast({
          message: `Выполнено: ${updated.title}`,
          tone: 'done',
          action: { label: 'Вернуть', perform: () => void applyDone(updated, false) },
        })
      }
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

  function handleToggle(task: TaskResponse) {
    void applyDone(task, !task.isDone)
  }

  async function handleMove(task: TaskResponse, projectId: string | null) {
    if (task.projectId === projectId || pending.has(task.id)) return

    setPending((current) => new Set(current).add(task.id))

    try {
      const updated = await setTaskProject(task.id, projectId)

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

  const openProject =
    view.kind === 'project' ? projects.find((project) => project.id === view.projectId) : undefined

  // Экран решает, какие задачи видны; счётчик и пустое состояние считают по ним же.
  // Выполненных среди видимых не бывает, поэтому счётчик — это их число.
  const visible = filterForView(list.status === 'ready' ? list.tasks : [], view)
  const countLine =
    visible.length === 0
      ? null
      : `Осталось ${visible.length} ${plural(visible.length, { one: 'задача', few: 'задачи', many: 'задач' })}`
  // Макет этого экрана не рисовал: день подписан в его стиле, но не по нему.
  const subtitle = [view.kind === 'today' ? formatTodaySubtitle(openedAt) : null, countLine]
    .filter(Boolean)
    .join(' · ')

  // Заголовок экрана: у проекта это его имя, у общих лент — прежние подписи.
  const title =
    view.kind === 'today' ? 'Сегодня' : view.kind === 'project' ? (openProject?.name ?? '') : monthTitle

  const emptyText =
    view.kind === 'today'
      ? 'На сегодня задач нет.'
      : view.kind === 'project'
        ? 'В проекте пока нет задач.'
        : 'Задач пока нет.'

  return (
    <div className="layout">
      <Sidebar
        view={view}
        projects={projects}
        onSelect={setView}
        onCreateProject={handleCreateProject}
        onRenameProject={handleRenameProject}
        onDeleteProject={handleDeleteProject}
      />

      <main className="main-stream">
        <div className="header-area">
          <h1 className="current-month">{title}</h1>
          {subtitle.length > 0 && <p className="header-subtitle">{subtitle}</p>}
        </div>

        {/* Ключ сбрасывает форму при смене экрана: проект задачи начинается с открытого. */}
        <NewTaskForm
          key={view.kind === 'project' ? view.projectId : view.kind}
          submitting={submitting}
          projects={projects}
          defaultProjectId={view.kind === 'project' ? view.projectId : null}
          onSubmit={handleCreate}
        />

        {list.status === 'loading' && <p className="hint">Загрузка…</p>}

        {list.status === 'error' && <p className="error">{list.message}</p>}

        {list.status === 'ready' && visible.length === 0 && (
          <p className="hint">{emptyText}</p>
        )}

        {list.status === 'ready' && visible.length > 0 && (
          <TaskStream
            tasks={visible}
            pending={pending}
            projects={projects}
            onToggle={handleToggle}
            onMove={handleMove}
          />
        )}
      </main>

      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}

export default App
