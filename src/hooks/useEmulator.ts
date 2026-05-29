import { useRef, useCallback, useEffect } from 'react'
import type { MainToWorker, WorkerToMain } from '../types/emulator'
import { NES_WIDTH, NES_HEIGHT } from '../types/emulator'
import { useEmulatorStore } from '../store/emulatorStore'

export interface UseEmulatorReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  loadROM: (file: File) => void
  loadROMFromBuffer: (buffer: ArrayBuffer, name: string) => void
  pause: () => void
  resume: () => void
  reset: () => void
  saveState: (slot: number) => void
  loadState: (slot: number, data: ArrayBuffer) => void
}

export function useEmulator(): UseEmulatorReturn {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const imageDataRef = useRef<ImageData | null>(null)
  const fpsCounter = useRef({ frames: 0, lastTime: performance.now() })
  const romNameRef = useRef<string>('Unknown')

  const {
    setStatus, setFps, incrementFrame,
    setCurrentROM, showNotification,
  } = useEmulatorStore()

  // ============================================================
  // Canvas 缩放
  // ============================================================
  function scaleCanvas(canvas: HTMLCanvasElement): void {
    const parent = canvas.parentElement
    if (!parent) return

    const parentW = parent.clientWidth
    const parentH = parent.clientHeight
    const scale = Math.min(parentW / NES_WIDTH, parentH / NES_HEIGHT)
    const displayW = Math.floor(NES_WIDTH * scale)
    const displayH = Math.floor(NES_HEIGHT * scale)

    canvas.style.width = `${displayW}px`
    canvas.style.height = `${displayH}px`
  }

  // ============================================================
  // 初始化 Worker
  // ============================================================
  useEffect(() => {
    const worker = new Worker(
      new URL('../worker/emulator.worker.ts', import.meta.url),
      { type: 'module' },
    )

    worker.onmessage = (e: MessageEvent<WorkerToMain>) => {
      const msg = e.data

      switch (msg.type) {
        case 'READY': {
          // Worker is initialized and ready
          break
        }

        case 'FRAME': {
          // 渲染帧到 Canvas
          const canvas = canvasRef.current
          if (canvas) {
            if (!ctxRef.current) {
              canvas.width = NES_WIDTH
              canvas.height = NES_HEIGHT
              ctxRef.current = canvas.getContext('2d')!
              imageDataRef.current = ctxRef.current.createImageData(NES_WIDTH, NES_HEIGHT)
            }

            const ctx = ctxRef.current
            const imageData = imageDataRef.current!
            const src = new Uint8ClampedArray(msg.video)
            imageData.data.set(src)
            ctx.putImageData(imageData, 0, 0)
            scaleCanvas(canvas)
          }

          // 播放音频
          if (msg.audio.byteLength > 0) {
            if (!audioCtxRef.current) {
              audioCtxRef.current = new AudioContext({ sampleRate: 44100 })
            }
            const actx = audioCtxRef.current
            if (actx.state === 'suspended') {
              actx.resume()
            }
            const samples = new Float32Array(msg.audio)
            if (samples.length > 0) {
              const audioBuffer = actx.createBuffer(1, samples.length, 44100)
              audioBuffer.getChannelData(0).set(samples)
              const source = actx.createBufferSource()
              source.buffer = audioBuffer
              source.connect(actx.destination)
              source.start()
            }
          }

          // FPS 计数
          incrementFrame()
          fpsCounter.current.frames++
          const now = performance.now()
          if (now - fpsCounter.current.lastTime >= 1000) {
            setFps(fpsCounter.current.frames)
            fpsCounter.current.frames = 0
            fpsCounter.current.lastTime = now
          }
          break
        }

        case 'ROM_LOADED': {
          setStatus('running')
          setCurrentROM({
            name: romNameRef.current,
            info: msg.info,
          })
          showNotification('ROM 加载成功 ♪')
          break
        }

        case 'ROM_ERROR': {
          setStatus('idle')
          showNotification(`ROM 加载失败：${msg.error}`)
          break
        }

        case 'STATE_SAVED': {
          showNotification(`存档 ${msg.slot} 已保存 ♡`)
          break
        }

        case 'STATE_LOADED': {
          showNotification('读档成功 ♪')
          break
        }

        case 'ERROR': {
          showNotification(`错误：${msg.error}`)
          break
        }
      }
    }

    worker.onerror = (err) => {
      console.error('Worker error:', err)
      showNotification('模拟核心异常')
    }

    workerRef.current = worker

    // 监听键盘输入事件（来自 useInput hook）
    const handleInput = (e: Event) => {
      const state = (e as CustomEvent).detail as number
      worker.postMessage({
        type: 'INPUT',
        controller1: state,
        controller2: 0,
      } satisfies MainToWorker)
    }
    window.addEventListener('nes-input', handleInput)

    return () => {
      window.removeEventListener('nes-input', handleInput)
      worker.terminate()
    }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================================
  // API 方法
  // ============================================================
  const postToWorker = useCallback((msg: MainToWorker, transferables?: Transferable[]) => {
    if (transferables && transferables.length > 0) {
      workerRef.current?.postMessage(msg, transferables)
    } else {
      workerRef.current?.postMessage(msg)
    }
  }, [])

  const loadROMFromBuffer = useCallback((buffer: ArrayBuffer, name: string) => {
    romNameRef.current = name
    setStatus('loading')
    postToWorker({ type: 'LOAD_ROM', rom: buffer }, [buffer])
  }, [postToWorker, setStatus])

  const loadROM = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      loadROMFromBuffer(reader.result as ArrayBuffer, file.name)
    }
    reader.onerror = () => {
      showNotification('文件读取失败')
    }
    reader.readAsArrayBuffer(file)
  }, [loadROMFromBuffer, showNotification])

  const pause = useCallback(() => {
    postToWorker({ type: 'PAUSE' })
    setStatus('paused')
  }, [postToWorker, setStatus])

  const resume = useCallback(() => {
    postToWorker({ type: 'RESUME' })
    setStatus('running')
  }, [postToWorker, setStatus])

  const reset = useCallback(() => {
    postToWorker({ type: 'RESET' })
  }, [postToWorker])

  const saveState = useCallback((slot: number) => {
    postToWorker({ type: 'SAVE_STATE', slot })
  }, [postToWorker])

  const loadState = useCallback((_slot: number, data: ArrayBuffer) => {
    postToWorker({ type: 'LOAD_STATE', data }, [data])
  }, [postToWorker])

  return {
    canvasRef,
    loadROM,
    loadROMFromBuffer,
    pause,
    resume,
    reset,
    saveState,
    loadState,
  }
}
