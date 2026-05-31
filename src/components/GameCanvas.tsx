import { useEffect, useRef } from 'react'
import { NES_WIDTH, NES_HEIGHT } from '../types/emulator'
import './GameCanvas.css'

interface GameCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  onDropROM: (file: File) => void
}

export default function GameCanvas({ canvasRef, onDropROM }: GameCanvasProps) {
  const internalRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    (canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = internalRef.current
  })

  useEffect(() => {
    const canvas = internalRef.current
    if (!canvas) return

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }
    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const file = e.dataTransfer?.files?.[0]
      if (file && (file.name.endsWith('.nes') || file.name.endsWith('.NES'))) {
        onDropROM(file)
      }
    }

    canvas.addEventListener('dragover', handleDragOver)
    canvas.addEventListener('drop', handleDrop)

    return () => {
      canvas.removeEventListener('dragover', handleDragOver)
      canvas.removeEventListener('drop', handleDrop)
    }
  }, [onDropROM])

  return (
    <div className="game-canvas-frame">
      <canvas
        ref={internalRef}
        className="game-canvas"
        width={NES_WIDTH}
        height={NES_HEIGHT}
        aria-label="NES emulator game canvas"
      />
    </div>
  )
}
