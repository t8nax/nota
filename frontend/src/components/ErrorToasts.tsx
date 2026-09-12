import { useEffect } from 'react'

/** Сколько попап висит на экране; полоску сверху ровно на это время и хватает. */
export const TOAST_LIFETIME_MS = 6000

export interface ErrorToast {
  /** Свой у каждого показа: один и тот же текст может прийти дважды подряд. */
  id: number
  message: string
}

interface ErrorToastsProps {
  toasts: readonly ErrorToast[]
  onDismiss: (id: number) => void
}

interface ToastProps {
  toast: ErrorToast
  onDismiss: (id: number) => void
}

/** Один попап: живёт отведённое время и снимает себя сам. */
function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), TOAST_LIFETIME_MS)

    return () => window.clearTimeout(timer)
  }, [toast.id, onDismiss])

  return (
    <div className="toast">
      {/* Остаток времени показывает полоска, а не число: она читается боковым зрением
          и не требует перерисовки на каждый тик. */}
      <span
        className="toast-countdown"
        style={{ animationDuration: `${TOAST_LIFETIME_MS}ms` }}
        aria-hidden="true"
      />

      <span className="toast-icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="7" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12" y2="17" />
        </svg>
      </span>

      <p className="toast-message">{toast.message}</p>

      <button
        type="button"
        className="toast-close"
        aria-label="Закрыть сообщение"
        onClick={() => onDismiss(toast.id)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </svg>
      </button>
    </div>
  )
}

/** Сообщения об ошибках в правом нижнем углу: свежее — ближе к углу. */
function ErrorToasts({ toasts, onDismiss }: ErrorToastsProps) {
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

export default ErrorToasts
