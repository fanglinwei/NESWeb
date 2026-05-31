import { useEmulatorStore } from '../store/emulatorStore'
import './FloatingControls.css'

interface FloatingControlsProps {
  onPause: () => void
  onResume: () => void
  onReset: () => void
  onSaveState: (slot: number) => void
  onFullscreen: () => void
}

export default function FloatingControls({
  onPause,
  onResume,
  onReset,
  onSaveState,
  onFullscreen,
}: FloatingControlsProps) {
  const status = useEmulatorStore((s) => s.status)
  const controlsVisible = useEmulatorStore((s) => s.controlsVisible)

  if (status === 'idle' || status === 'loading') return null

  return (
    <div
      className="floating-controls"
      style={{ opacity: controlsVisible ? 1 : 0 }}
    >
      {/* Group 1: Playback */}
      <div className="floating-controls__group">
        {status === 'running' ? (
          <button
            className="floating-controls__btn floating-controls__btn--accent"
            onClick={onPause}
            aria-label="Pause"
          >
            ⏸
          </button>
        ) : (
          <button
            className="floating-controls__btn floating-controls__btn--accent"
            onClick={onResume}
            aria-label="Resume"
          >
            ▶
          </button>
        )}
        <button
          className="floating-controls__btn floating-controls__btn--danger"
          onClick={onReset}
          aria-label="Reset"
        >
          ↺
        </button>
      </div>

      <span className="floating-controls__divider" />

      {/* Group 2: Save */}
      <div className="floating-controls__group">
        <button
          className="floating-controls__btn floating-controls__btn--accent"
          onClick={() => onSaveState(1)}
          aria-label="Save state"
        >
          💾
        </button>
      </div>

      <span className="floating-controls__divider" />

      {/* Group 3: System */}
      <div className="floating-controls__group">
        <button
          className="floating-controls__btn"
          onClick={onFullscreen}
          aria-label="Fullscreen"
        >
          ⛶
        </button>
      </div>
    </div>
  )
}
