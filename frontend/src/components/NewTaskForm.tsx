import { useState, type FormEvent } from 'react'

interface NewTaskFormProps {
  submitting: boolean
  onSubmit: (title: string) => Promise<boolean>
}

/** Поле ввода в стиле дизайна: кнопка появляется рядом, когда есть что отправлять. */
function NewTaskForm({ submitting, onSubmit }: NewTaskFormProps) {
  const [title, setTitle] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (submitting) return

    // Поле очищается только после удачного создания, иначе введённый текст пропал бы зря.
    if (await onSubmit(title)) setTitle('')
  }

  return (
    <form className="new-task" onSubmit={handleSubmit}>
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
      <button type="submit" disabled={submitting || title.trim().length === 0}>
        {submitting ? 'Добавляю…' : 'Добавить'}
      </button>
    </form>
  )
}

export default NewTaskForm
