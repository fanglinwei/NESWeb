import { useCallback, useRef } from 'react'
import { NES_BUTTON } from '../types/emulator'
import './TouchGamepad.css'

interface TouchGamepadProps {
  onInput: (state: number) => void
}

interface ButtonDef {
  label: string
  button: number
  cssClass: string
  ariaLabel: string
}

export default function TouchGamepad({ onInput }: TouchGamepadProps) {
  const stateRef = useRef(0)

  const updateButton = useCallback((button: number, pressed: boolean) => {
    stateRef.current = pressed
      ? stateRef.current | button
      : stateRef.current & ~button
    onInput(stateRef.current)
  }, [onInput])

  const dPadButtons: ButtonDef[] = [
    { label: '▲', button: NES_BUTTON.UP,    cssClass: 'touch-gamepad__dpad-up',    ariaLabel: 'Up' },
    { label: '◄', button: NES_BUTTON.LEFT,  cssClass: 'touch-gamepad__dpad-left',  ariaLabel: 'Left' },
    { label: '►', button: NES_BUTTON.RIGHT, cssClass: 'touch-gamepad__dpad-right', ariaLabel: 'Right' },
    { label: '▼', button: NES_BUTTON.DOWN,  cssClass: 'touch-gamepad__dpad-down',  ariaLabel: 'Down' },
  ]

  const metaButtons: ButtonDef[] = [
    { label: '−', button: NES_BUTTON.SELECT, cssClass: '', ariaLabel: 'Select' },
    { label: '+', button: NES_BUTTON.START,  cssClass: '', ariaLabel: 'Start' },
  ]

  const actionButtons: ButtonDef[] = [
    { label: 'B', button: NES_BUTTON.B, cssClass: 'touch-gamepad__action-b', ariaLabel: 'B button' },
    { label: 'A', button: NES_BUTTON.A, cssClass: 'touch-gamepad__action-a', ariaLabel: 'A button' },
  ]

  const makeHandlers = (button: number) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      updateButton(button, true)
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.preventDefault()
      updateButton(button, false)
    },
    onPointerCancel: () => updateButton(button, false),
  })

  return (
    <div
      className="touch-gamepad"
      onPointerCancel={() => {
        if (stateRef.current !== 0) {
          stateRef.current = 0
          onInput(0)
        }
      }}
      onPointerLeave={() => {
        if (stateRef.current !== 0) {
          stateRef.current = 0
          onInput(0)
        }
      }}
    >
      {/* Left: D-Pad */}
      <div className="touch-gamepad__left">
        <div className="touch-gamepad__dpad">
          {dPadButtons.map((btn) => (
            <button
              key={btn.label}
              type="button"
              className={`touch-gamepad__dpad-btn ${btn.cssClass}`}
              aria-label={btn.ariaLabel}
              {...makeHandlers(btn.button)}
            >
              {btn.label}
            </button>
          ))}
          <div className="touch-gamepad__dpad-btn touch-gamepad__dpad-center" />
        </div>
      </div>

      {/* Right: A/B (top) + Select/Start (bottom) — Switch style */}
      <div className="touch-gamepad__right">
        <div className="touch-gamepad__actions">
          {actionButtons.map((btn) => (
            <button
              key={btn.label}
              type="button"
              className={`touch-gamepad__action-btn ${btn.cssClass}`}
              aria-label={btn.ariaLabel}
              {...makeHandlers(btn.button)}
            >
              {btn.label}
            </button>
          ))}
        </div>
        <div className="touch-gamepad__meta">
          {metaButtons.map((btn) => (
            <button
              key={btn.label}
              type="button"
              className="touch-gamepad__meta-btn"
              aria-label={btn.ariaLabel}
              {...makeHandlers(btn.button)}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
