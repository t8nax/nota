import { useState, type FormEvent } from 'react'
import type { DueInput, ProjectResponse } from '../api'
import DuePicker from './DuePicker'
import ProjectPicker from './ProjectPicker'

interface NewTaskFormProps {
  submitting: boolean
  projects: readonly ProjectResponse[]
  /** Срок открытого экрана: на «Сегодня» это сегодня, на остальных — пусто. */
  defaultDue: DueInput
  /** Проект открытого экрана: с него начинается выбор, пока его не сменили. */
  defaultProjectId: string | null
  onSubmit: (title: string, due: DueInput, projectId: string | null) => Promise<boolean>
}

const EMPTY_DUE: DueInput = { date: '', time: '' }

/** Поле ввода в стиле дизайна: под заголовком — срок, время доступно только с датой. */
function NewTaskForm({ submitting, projects, defaultDue, defaultProjectId, onSubmit }: NewTaskFormProps) {
  const [title, setTitle] = useState('')
  const [due, setDue] = useState<DueInput>(defaultDue)
  const [projectId, setProjectId] = useState<string | null>(defaultProjectId)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (submitting) return

    // Поля очищаются только после удачного создания, иначе введённое пропало бы зря.
    if (await onSubmit(title, due, projectId)) {
      setTitle('')
      setDue(defaultDue)
      setProjectId(defaultProjectId)
    }
  }

  function handleDateChange(date: string) {
    // Время без дня бессмысленно, и API его не примет: снятие даты снимает и время.
    setDue(date === '' ? EMPTY_DUE : { ...due, date })
  }

  return (
    <form className="new-task" onSubmit={handleSubmit}>
      <div className="new-task-title-row">
        <span className="new-task-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </span>
        <input
          className="new-task-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Что нужно сделать?"
          aria-label="Заголовок новой задачи"
          disabled={submitting}
        />
        <button
          type="submit"
          className="new-task-submit"
          disabled={submitting || title.trim().length === 0}
        >
          {submitting ? 'Добавляю…' : 'Добавить'}
        </button>
      </div>

      <div className="new-task-pickers">
        <DuePicker
          value={due}
          disabled={submitting}
          onDateChange={handleDateChange}
          onTimeChange={(time) => setDue({ ...due, time })}
        />

        <ProjectPicker
          projects={projects}
          value={projectId}
          label="Проект задачи"
          disabled={submitting}
          onPick={setProjectId}
        />
      </div>
    </form>
  )
}

export default NewTaskForm
