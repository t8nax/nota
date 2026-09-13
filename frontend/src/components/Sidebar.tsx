import { useState, type ReactNode } from 'react'
import type { ProjectResponse } from '../api'
import type { View } from '../grouping'
import ProjectNav from './ProjectNav'

interface SidebarProps {
  view: View
  projects: readonly ProjectResponse[]
  onSelect: (view: View) => void
  onCreateProject: (name: string) => Promise<boolean>
  onRenameProject: (id: string, name: string) => Promise<boolean>
  onDeleteProject: (id: string) => Promise<void>
}

/** Общие экраны в том порядке, в каком они стоят в левой колонке. */
const VIEWS: { view: View; label: string; icon: ReactNode }[] = [
  {
    view: { kind: 'inbox' },
    label: 'Входящие',
    icon: (
      <>
        <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
        <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      </>
    ),
  },
  {
    view: { kind: 'today' },
    label: 'Сегодня',
    icon: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </>
    ),
  },
  {
    view: { kind: 'all' },
    label: 'Все задачи',
    icon: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="21" x2="9" y2="9" />
      </>
    ),
  },
]

/** Открыт ли сейчас этот экран. Проекты живут в своём разделе и сюда не попадают. */
function isOpen(view: View, candidate: View): boolean {
  return view.kind === candidate.kind
}

/**
 * Левая колонка: бренд, общие экраны ленты и список проектов. На узком экране она
 * сжата до знаков, и кнопка под брендом раскрывает её до полной; на широком экране
 * кнопка скрыта стилями, а колонка всегда полная.
 */
function Sidebar({
  view,
  projects,
  onSelect,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
}: SidebarProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <aside className={expanded ? 'sidebar expanded' : 'sidebar'}>
      <div className="brand">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <path
            d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>Nota</span>
      </div>

      <button
        type="button"
        className="sidebar-toggle"
        aria-label={expanded ? 'Свернуть колонку' : 'Раскрыть колонку'}
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      </button>

      <nav aria-label="Списки">
        <p className="nav-group-label">Списки</p>
        {VIEWS.map((item) => (
          <button
            key={item.label}
            type="button"
            className={isOpen(view, item.view) ? 'nav-item active' : 'nav-item'}
            aria-current={isOpen(view, item.view) ? 'page' : undefined}
            onClick={() => onSelect(item.view)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              {item.icon}
            </svg>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <ProjectNav
        projects={projects}
        view={view}
        onSelect={onSelect}
        onCreate={onCreateProject}
        onRename={onRenameProject}
        onDelete={onDeleteProject}
      />
    </aside>
  )
}

export default Sidebar
