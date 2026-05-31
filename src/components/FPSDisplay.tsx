import { useEmulatorStore } from '../store/emulatorStore'
import './FPSDisplay.css'

export default function FPSDisplay() {
  const fps = useEmulatorStore((s) => s.fps)
  const status = useEmulatorStore((s) => s.status)

  if (status !== 'running' && status !== 'paused') return null

  const tone = fps >= 58 ? 'good' : fps >= 45 ? 'warn' : 'bad'

  return (
    <div className={`fps-display fps-display--${tone}`} aria-label={`帧率 ${fps} FPS`}>
      {fps} fps
    </div>
  )
}
