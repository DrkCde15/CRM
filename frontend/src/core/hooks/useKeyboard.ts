import { useEffect } from 'react'

type KeyMap = Record<string, () => void>

export function useKeyboard(keyMap: KeyMap) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const key = [e.ctrlKey || e.metaKey ? 'Ctrl' : '', e.shiftKey ? 'Shift' : '', e.altKey ? 'Alt' : '', e.key.toUpperCase()]
        .filter(Boolean)
        .join('+')
      const action = keyMap[key] || keyMap[e.key.toLowerCase()]
      if (action) {
        e.preventDefault()
        action()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [keyMap])
}