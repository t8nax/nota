import { useEffect, useRef, useState } from 'react'
import type { ProjectResponse } from '../api'

interface ProjectPickerProps {
  projects: readonly ProjectResponse[]
  /** Выбранный проект или null — «Без проекта». */
  value: string | null
  label: string
  disabled?: boolean
  onPick: (projectId: string | null) => void
}

const NO_PROJECT = 'Без проекта'

/** Выбор проекта чипом с попапом: тем же способом задаются срок и его время. */
function ProjectPicker({ projects, value, label, disabled = false, onPick }: ProjectPickerProps) {
  const [opened, setOpened] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  // Форма блокируется на время отправки, и попап закрывается вместе с ней.
  if (disabled && opened) setOpened(false)

  useEffect(() => {
    if (!opened) return

    function handlePointerDown(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpened(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpened(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [opened])

  const current = projects.find((project) => project.id === value)

  function pick(projectId: string | null) {
    onPick(projectId)
    setOpened(false)
  }

  return (
    <div className="due-slot" ref={root}>
      <button
        type="button"
        className={current ? 'due-chip filled' : 'due-chip'}
        aria-label={label}
        aria-expanded={opened}
        disabled={disabled}
        onClick={() => setOpened((current) => !current)}
      >
        <span className="project-dot" aria-hidden="true" />
        <span>{current?.name ?? NO_PROJECT}</span>
      </button>

      {opened && (
        <div className="due-popover project-popover" role="dialog" aria-label={label}>
          <button
            type="button"
            className={value === null ? 'project-option chosen' : 'project-option'}
            onClick={() => pick(null)}
          >
            {NO_PROJECT}
          </button>

          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              className={project.id === value ? 'project-option chosen' : 'project-option'}
              onClick={() => pick(project.id)}
            >
              {project.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default ProjectPicker
