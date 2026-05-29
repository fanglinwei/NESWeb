import { useEffect, useRef } from 'react'
import { NES_BUTTON } from '../types/emulator'

// 默认键盘映射：方向键 + Z/X（对应 B/A）
const DEFAULT_KEY_MAP: Record<string, number> = {
  'ArrowUp':    NES_BUTTON.UP,
  'ArrowDown':  NES_BUTTON.DOWN,
  'ArrowLeft':  NES_BUTTON.LEFT,
  'ArrowRight': NES_BUTTON.RIGHT,
  'KeyZ':       NES_BUTTON.B,
  'KeyX':       NES_BUTTON.A,
  'Enter':      NES_BUTTON.START,
  'ShiftRight': NES_BUTTON.SELECT,
  'ShiftLeft':  NES_BUTTON.SELECT,
}

export function useInput(onInputChange: (controllerState: number) => void): void {
  const stateRef = useRef(0)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const button = DEFAULT_KEY_MAP[e.code]
      if (button !== undefined) {
        e.preventDefault()
        stateRef.current |= button
        onInputChange(stateRef.current)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const button = DEFAULT_KEY_MAP[e.code]
      if (button !== undefined) {
        e.preventDefault()
        stateRef.current &= ~button
        onInputChange(stateRef.current)
      }
    }

    // 窗口失去焦点时重置所有按键
    const handleBlur = () => {
      stateRef.current = 0
      onInputChange(0)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
    }
  }, [onInputChange])
}
