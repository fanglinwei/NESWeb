import { useEmulatorStore } from '../store/emulatorStore'
import './FloatingControls.css'

interface FloatingControlsProps {
  onPause: () => void
  onResume: () => void
  onReset: () => void
  onSaveState: (slot: number) => void
  onFullscreen: () => void
  onSettings: () => void
}

type ControlIcon = 'pause' | 'play' | 'reset' | 'save' | 'fullscreen' | 'settings'

interface ControlButtonProps {
  label: string
  icon: ControlIcon
  onClick: () => void
  variant?: 'accent' | 'danger'
  pressed?: boolean
}

function Icon({ name }: { name: ControlIcon }) {
  switch (name) {
    case 'pause':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M9 5H7a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1Z" />
          <path d="M17 5h-2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1Z" />
        </svg>
      )
    case 'play':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M8 5.5v13l11-6.5-11-6.5Z" />
        </svg>
      )
    case 'reset':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M6.4 8.8A6.9 6.9 0 1 1 5 13h2.2a4.7 4.7 0 1 0 1.1-3l2.2 2.2H4.8V6.5l1.6 2.3Z" />
        </svg>
      )
    case 'save':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M5 4h11.6L20 7.4V20H5V4Zm3 2v5h8V6H8Zm8 12v-4H8v4h8Z" />
        </svg>
      )
    case 'fullscreen':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M5 5h6v2H8.4L12 10.6 10.6 12 7 8.4V11H5V5Zm8 0h6v6h-2V8.4L13.4 12 12 10.6 15.6 7H13V5ZM7 15.6 10.6 12 12 13.4 8.4 17H11v2H5v-6h2v2.6ZM13.4 12 17 15.6V13h2v6h-6v-2h2.6L12 13.4 13.4 12Z" />
        </svg>
      )
    case 'settings':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M13 3 13.8 5.5c.5.2 1 .4 1.4.6L17.6 5l1.4 1.4-1.1 2.4c.3.5.5.9.6 1.4L21 11v2l-2.5.8c-.2.5-.4 1-.6 1.4l1.1 2.4-1.4 1.4-2.4-1.1c-.5.3-.9.5-1.4.6L13 21h-2l-.8-2.5c-.5-.2-1-.4-1.4-.6L6.4 19 5 17.6l1.1-2.4c-.3-.5-.5-.9-.6-1.4L3 13v-2l2.5-.8c.2-.5.4-1 .6-1.4L5 6.4 6.4 5l2.4 1.1c.5-.3.9-.5 1.4-.6L11 3h2Zm-1 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
        </svg>
      )
  }
}

function ControlButton({ label, icon, onClick, variant, pressed }: ControlButtonProps) {
  const className = [
    'floating-controls__btn',
    variant === 'accent' ? 'floating-controls__btn--accent' : '',
    variant === 'danger' ? 'floating-controls__btn--danger' : '',
  ].filter(Boolean).join(' ')

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      data-tooltip={label}
    >
      <Icon name={icon} />
    </button>
  )
}

export default function FloatingControls({
  onPause,
  onResume,
  onReset,
  onSaveState,
  onFullscreen,
  onSettings,
}: FloatingControlsProps) {
  const status = useEmulatorStore((s) => s.status)
  const controlsVisible = useEmulatorStore((s) => s.controlsVisible)

  if (status === 'idle' || status === 'loading') return null

  return (
    <div
      className="floating-controls"
      style={{ opacity: controlsVisible ? 1 : 0 }}
      aria-label="Emulator controls"
    >
      <div className="floating-controls__group" aria-label="Playback controls">
        {status === 'running' ? (
          <ControlButton label="Pause" icon="pause" onClick={onPause} variant="accent" pressed />
        ) : (
          <ControlButton label="Resume" icon="play" onClick={onResume} variant="accent" pressed={false} />
        )}
        <ControlButton label="Reset" icon="reset" onClick={onReset} variant="danger" />
      </div>

      <span className="floating-controls__divider" aria-hidden="true" />

      <div className="floating-controls__group" aria-label="File controls">
        <ControlButton label="Save state" icon="save" onClick={() => onSaveState(1)} variant="accent" />
      </div>

      <span className="floating-controls__divider" aria-hidden="true" />

      <div className="floating-controls__group" aria-label="System controls">
        <ControlButton label="Fullscreen" icon="fullscreen" onClick={onFullscreen} />
        <ControlButton label="Settings" icon="settings" onClick={onSettings} />
      </div>
    </div>
  )
}
