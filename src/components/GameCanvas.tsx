import { useEffect, useRef } from 'react'
import { NES_WIDTH, NES_HEIGHT } from '../types/emulator'

interface GameCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  onDropROM: (file: File) => void
}

export default function GameCanvas({ canvasRef, onDropROM }: GameCanvasProps) {
  const internalRef = useRef<HTMLCanvasElement>(null)

  // 将内部 ref 同步到外部 ref
  useEffect(() => {
    (canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = internalRef.current
  })

  // 阻止默认拖放行为，处理 ROM 文件拖入
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
    <canvas
      ref={internalRef}
      width={NES_WIDTH}
      height={NES_HEIGHT}
      style={{
        display: 'block',
        margin: '0 auto',
        imageRendering: 'pixelated',
        borderRadius: 'var(--radius-sm)',
        boxShadow: '0 8px 32px rgba(255, 102, 153, 0.2)',
      }}
    />
  )
}
