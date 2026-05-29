import { useEmulatorStore } from '../store/emulatorStore'

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
      style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '8px',
        padding: '10px 18px',
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: '30px',
        border: '3px solid var(--border)',
        boxShadow: 'var(--shadow)',
        opacity: controlsVisible ? 1 : 0,
        transition: 'opacity 0.3s ease',
        zIndex: 10,
      }}
    >
      {status === 'running' ? (
        <button className="soft-button soft-button--pink" onClick={onPause}>⏸</button>
      ) : (
        <button className="soft-button soft-button--pink" onClick={onResume}>▶</button>
      )}
      <button className="soft-button soft-button--orange" onClick={onReset}>↺</button>
      <button className="soft-button soft-button--blue" onClick={() => onSaveState(1)}>♡</button>
      <button className="soft-button soft-button--blue" onClick={onFullscreen}>⛶</button>
    </div>
  )
}
