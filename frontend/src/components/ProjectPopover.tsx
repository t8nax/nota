import type { ProjectResponse } from '../api'

/** Так называется отсутствие проекта. Это только подпись: проектом «Входящие» не являются. */
export const NO_PROJECT = 'Входящие'

interface ProjectPopoverProps {
  projects: readonly ProjectResponse[]
  /** Выбранный проект или null — «Входящие». */
  value: string | null
  label: string
  className: string
  onPick: (projectId: string | null) => void
}

/** Список проектов в попапе: один и тот же у чипа карточки, формы и окна правки. */
function ProjectPopover({ projects, value, label, className, onPick }: ProjectPopoverProps) {
  return (
    <div className={className} role="dialog" aria-label={label}>
      <button
        type="button"
        className={value === null ? 'project-option chosen' : 'project-option'}
        onClick={() => onPick(null)}
      >
        {NO_PROJECT}
      </button>

      {projects.map((project) => (
        <button
          key={project.id}
          type="button"
          className={project.id === value ? 'project-option chosen' : 'project-option'}
          onClick={() => onPick(project.id)}
        >
          {project.name}
        </button>
      ))}
    </div>
  )
}

export default ProjectPopover
