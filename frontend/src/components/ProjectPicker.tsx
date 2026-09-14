import { useState } from 'react'
import type { ProjectResponse } from '../api'
import { useDismiss } from '../useDismiss'
import ProjectPopover, { NO_PROJECT } from './ProjectPopover'

interface ProjectPickerProps {
  projects: readonly ProjectResponse[]
  /** Выбранный проект или null — «Входящие». */
  value: string | null
  label: string
  disabled?: boolean
  /** К какому краю чипа прижат попап: у карточки чип стоит у правого края ленты. */
  align?: 'left' | 'right'
  onPick: (projectId: string | null) => void
}

/** Выбор проекта чипом с попапом: тем же способом задаются срок и его время. */
function ProjectPicker({ projects, value, label, disabled = false, align = 'left', onPick }: ProjectPickerProps) {
  const [opened, setOpened] = useState(false)
  const root = useDismiss<HTMLDivElement>(opened, () => setOpened(false))

  // Форма блокируется на время отправки, и попап закрывается вместе с ней.
  if (disabled && opened) setOpened(false)

  const current = projects.find((project) => project.id === value)

  function pick(projectId: string | null) {
    onPick(projectId)
    setOpened(false)
  }

  // Пустой чип прячется стилями карточки: показывать «Входящие» на каждой
  // задаче без проекта — шум, а место под чип всё равно нужно.
  const slotClass = current ? 'due-slot' : 'due-slot project-slot-empty'
  const popoverClass = align === 'right' ? 'due-popover project-popover align-right' : 'due-popover project-popover'

  return (
    <div className={slotClass} ref={root}>
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
        <ProjectPopover projects={projects} value={value} label={label} className={popoverClass} onPick={pick} />
      )}
    </div>
  )
}

export default ProjectPicker
