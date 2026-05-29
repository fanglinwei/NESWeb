import { useEmulatorStore } from '../store/emulatorStore'

export default function FPSDisplay() {
  const fps = useEmulatorStore((s) => s.fps)
  const status = useEmulatorStore((s) => s.status)

  if (status !== 'running' && status !== 'paused') return null

  return (
    <div
      style={{
        position: 'absolute',
        top: '10px',
        right: '14px',
        padding: '3px 10px',
        background: 'rgba(0, 0, 0, 0.55)',
        borderRadius: '8px',
        color: fps >= 58 ? '#88ff88' : fps >= 45 ? '#ffcc44' : '#ff6666',
        fontFamily: 'var(--font-pixel)',
        fontSize: '13px',
        fontWeight: 700,
        zIndex: 20,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      {fps} fps
    </div>
  )
}
