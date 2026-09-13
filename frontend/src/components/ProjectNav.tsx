import { useEffect, useRef, useState, type FocusEvent, type FormEvent } from 'react'
import type { ProjectResponse } from '../api'
import type { View } from '../grouping'

interface ProjectNavProps {
  projects: readonly ProjectResponse[]
  view: View
  onSelect: (view: View) => void
  onCreate: (name: string) => Promise<boolean>
  onRename: (id: string, name: string) => Promise<boolean>
  onDelete: (id: string) => Promise<void>
}

/** Что сейчас делает раздел: обычный список, ввод имени или подтверждение удаления. */
type Mode =
  | { kind: 'idle' }
  | { kind: 'creating' }
  | { kind: 'renaming'; id: string }
  | { kind: 'deleting'; id: string }

/** Раздел проектов: список, заведение, переименование и удаление вместе с задачами. */
function ProjectNav({ projects, view, onSelect, onCreate, onRename, onDelete }: ProjectNavProps) {
  const [mode, setMode] = useState<Mode>({ kind: 'idle' })
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [name, setName] = useState('')
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    if (menuFor === null) return

    function handlePointerDown(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setMenuFor(null)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuFor(null)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuFor])

  function startCreating() {
    setMenuFor(null)
    setName('')
    setMode({ kind: 'creating' })
  }

  function startRenaming(project: ProjectResponse) {
    setMenuFor(null)
    setName(project.name)
    setMode({ kind: 'renaming', id: project.id })
  }

  async function submitName(event: FormEvent) {
    event.preventDefault()

    const trimmed = name.trim()

    if (trimmed.length === 0) return

    // Поле закрывается только после удачного ответа: иначе введённое имя пропало бы,
    // а человеку осталось бы одно сообщение об отказе.
    const done =
      mode.kind === 'renaming' ? await onRename(mode.id, trimmed) : await onCreate(trimmed)

    if (done) setMode({ kind: 'idle' })
  }

  /** Ввод закрывается, как только фокус ушёл из него: иначе отменить его нечем. */
  function handleBlur(event: FocusEvent<HTMLFormElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) setMode({ kind: 'idle' })
  }

  function renderNameField(label: string) {
    return (
      <form className="project-form" onSubmit={submitName} onBlur={handleBlur}>
        <input
          className="project-input"
          value={name}
          placeholder="Имя проекта"
          aria-label={label}
          autoFocus
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setMode({ kind: 'idle' })
          }}
        />
        <button type="submit" className="project-form-submit" disabled={name.trim().length === 0}>
          Готово
        </button>
      </form>
    )
  }

  return (
    <nav aria-label="Проекты" ref={root}>
      <p className="nav-group-label">Проекты</p>

      {projects.map((project) => {
        const projectView: View = { kind: 'project', projectId: project.id }
        const open = view.kind === 'project' && view.projectId === project.id

        if (mode.kind === 'renaming' && mode.id === project.id) {
          return <div key={project.id}>{renderNameField('Новое название проекта')}</div>
        }

        return (
          <div key={project.id} className="project-row">
            <button
              type="button"
              className={open ? 'nav-item active' : 'nav-item'}
              aria-current={open ? 'page' : undefined}
              onClick={() => onSelect(projectView)}
            >
              {/* Цвета у проекта нет: точка макета осталась, но одна на всех. */}
              <span className="project-dot" aria-hidden="true" />
              <span className="project-name">{project.name}</span>
            </button>

            <button
              type="button"
              className="project-menu-button"
              aria-label={`Действия проекта «${project.name}»`}
              aria-expanded={menuFor === project.id}
              onClick={() => setMenuFor((current) => (current === project.id ? null : project.id))}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="5" cy="12" r="1.8" />
                <circle cx="12" cy="12" r="1.8" />
                <circle cx="19" cy="12" r="1.8" />
              </svg>
            </button>

            {menuFor === project.id && (
              <div className="project-menu" role="menu">
                <button type="button" role="menuitem" onClick={() => startRenaming(project)}>
                  Переименовать
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="danger"
                  onClick={() => {
                    setMenuFor(null)
                    setMode({ kind: 'deleting', id: project.id })
                  }}
                >
                  Удалить
                </button>
              </div>
            )}

            {mode.kind === 'deleting' && mode.id === project.id && (
              <div className="project-confirm" role="dialog" aria-label="Удаление проекта">
                {/* Отменить удаление нечем, поэтому спрашиваем до, а не после. */}
                <p>Удалить проект «{project.name}»?</p>
                <div className="project-confirm-actions">
                  <button
                    type="button"
                    className="danger"
                    onClick={() => {
                      setMode({ kind: 'idle' })
                      void onDelete(project.id)
                    }}
                  >
                    Удалить
                  </button>
                  <button type="button" onClick={() => setMode({ kind: 'idle' })}>
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Единственный вход в поле ввода имени, и стоит он под списком: когда
          проектов много, курсор и так внизу, а не у заголовка раздела. */}
      {mode.kind === 'creating' ? (
        renderNameField('Название проекта')
      ) : (
        <button type="button" className="nav-item nav-item-add" onClick={startCreating}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Добавить проект</span>
        </button>
      )}
    </nav>
  )
}

export default ProjectNav
