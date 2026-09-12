import type { ReactNode } from 'react'
import type { ViewId } from '../grouping'

interface SidebarProps {
  view: ViewId
  onSelect: (view: ViewId) => void
}

/** Экраны в том порядке, в каком они стоят в левой колонке. */
const VIEWS: { id: ViewId; label: string; icon: ReactNode }[] = [
  {
    id: 'today',
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
    id: 'all',
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

/** Левая колонка: бренд и переключатель экранов ленты. */
function Sidebar({ view, onSelect }: SidebarProps) {
  return (
    <aside className="sidebar">
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

      <nav aria-label="Списки">
        <p className="nav-group-label">Списки</p>
        {VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === view ? 'nav-item active' : 'nav-item'}
            aria-current={item.id === view ? 'page' : undefined}
            onClick={() => onSelect(item.id)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              {item.icon}
            </svg>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar
