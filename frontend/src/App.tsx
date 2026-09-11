import { useEffect, useState } from 'react'
import { fetchTasks, type TaskResponse } from './api'
import './App.css'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; tasks: TaskResponse[] }

function App() {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    fetchTasks()
      .then((tasks) => {
        if (!cancelled) setState({ status: 'ready', tasks })
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({ status: 'error', message: error instanceof Error ? error.message : String(error) })
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="app">
      <h1>Список дел</h1>

      {state.status === 'loading' && <p className="hint">Загрузка…</p>}

      {state.status === 'error' && <p className="error">{state.message}</p>}

      {state.status === 'ready' && state.tasks.length === 0 && <p className="hint">Задач пока нет.</p>}

      {state.status === 'ready' && state.tasks.length > 0 && (
        <ul className="tasks">
          {state.tasks.map((task) => (
            <li key={task.id} className={task.isDone ? 'task done' : 'task'}>
              <span className="marker">{task.isDone ? '✓' : '○'}</span>
              <span className="title">{task.title}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

export default App
