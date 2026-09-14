import { useEffect } from 'react'

/** Сколько попап висит на экране; полоски сверху ровно на это время и хватает. */
export const TOAST_LIFETIME_MS = 6000

/** Кнопка внутри попапа: единственное, что можно сделать, пока попап жив. */
export interface ToastAction {
  label: string
  perform: () => void
}

export interface ToastData {
  /** Свой у каждого показа: один и тот же текст может прийти дважды подряд. */
  id: number
  message: string
  /** Отказ действия, выполнение или удаление: от этого зависят знак и цвет попапа. */
  tone: 'error' | 'done' | 'deleted'
  action?: ToastAction
  /** Попап ушёл без нажатия на действие — истёк или закрыт крестиком. */
  onExpire?: () => void
}

interface ToastsProps {
  toasts: readonly ToastData[]
  onDismiss: (id: number) => void
}

interface ToastProps {
  toast: ToastData
  onDismiss: (id: number) => void
}

/** Один попап: живёт отведённое время и снимает себя сам. */
function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      toast.onExpire?.()
      onDismiss(toast.id)
    }, TOAST_LIFETIME_MS)

    return () => window.clearTimeout(timer)
  }, [toast, onDismiss])

  return (
    <div className={`toast ${toast.tone}`}>
      {/* Остаток времени показывает полоска, а не число: она читается боковым зрением
          и не требует перерисовки на каждый тик. */}
      <span
        className="toast-countdown"
        style={{ animationDuration: `${TOAST_LIFETIME_MS}ms` }}
        aria-hidden="true"
      />

      <span className="toast-icon" aria-hidden="true">
        {toast.tone === 'done' ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="12" cy="12" r="9" />
            <polyline points="8,12.5 11,15.5 16,9.5" />
          </svg>
        ) : toast.tone === 'deleted' ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="7" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12" y2="17" />
          </svg>
        )}
      </span>

      <p className="toast-message">{toast.message}</p>

      {toast.action && (
        <button
          type="button"
          className="toast-action"
          onClick={() => {
            toast.action?.perform()
            // Кнопка одноразовая: второе нажатие делало бы то же самое ещё раз.
            onDismiss(toast.id)
          }}
        >
          {toast.action.label}
        </button>
      )}

      <button
        type="button"
        className="toast-close"
        aria-label="Закрыть сообщение"
        onClick={() => {
          toast.onExpire?.()
          onDismiss(toast.id)
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </svg>
      </button>
    </div>
  )
}

/** Попапы в правом нижнем углу: свежий — ближе к углу. */
function Toasts({ toasts, onDismiss }: ToastsProps) {
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

export default Toasts
