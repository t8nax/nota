import { useEffect, useRef } from 'react'

/**
 * Закрывает открытый слой: клик мимо, уход фокуса наружу, Escape. Возвращает ref
 * для корня, внутри которого живут и слой, и открывшая его кнопка: клик по ней
 * слой не закрывает, а переключает.
 */
export function useDismiss<T extends HTMLElement>(open: boolean, onDismiss: () => void) {
  const root = useRef<T>(null)
  // Свежий обработчик без переподписки: иначе слушатели снимались бы на каждый рендер.
  const dismiss = useRef(onDismiss)

  useEffect(() => {
    dismiss.current = onDismiss
  })

  useEffect(() => {
    if (!open) return

    function handleOutside(event: Event) {
      if (!root.current?.contains(event.target as Node)) dismiss.current()
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') dismiss.current()
    }

    document.addEventListener('pointerdown', handleOutside, true)
    document.addEventListener('focusin', handleOutside, true)
    document.addEventListener('keydown', handleKeyDown, true)

    return () => {
      document.removeEventListener('pointerdown', handleOutside, true)
      document.removeEventListener('focusin', handleOutside, true)
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [open])

  return root
}
