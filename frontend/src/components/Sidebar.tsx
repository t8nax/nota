/** Левая колонка: бренд и единственный список, который умеет показывать приложение. */
function Sidebar() {
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
        <span>Everlog</span>
      </div>

      <nav aria-label="Списки">
        <p className="nav-group-label">Списки</p>
        {/* Список один, поэтому пункт — указатель текущего экрана, а не переключатель. */}
        <span className="nav-item active" aria-current="page">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
          <span>Все задачи</span>
        </span>
      </nav>
    </aside>
  )
}

export default Sidebar
