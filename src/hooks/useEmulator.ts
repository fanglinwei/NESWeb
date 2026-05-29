import { useRef, useCallback, useEffect } from 'react'
import type { MainToWorker, WorkerToMain } from '../types/emulator'
import { NES_WIDTH, NES_HEIGHT } from '../types/emulator'
import { useEmulatorStore } from '../store/emulatorStore'
import { putSaveState, getSaveState, getLatestSaveState } from '../utils/db'

export interface UseEmulatorReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  loadROM: (file: File) => void
  loadROMFromBuffer: (buffer: ArrayBuffer, name: string) => void
  pause: () => void
  resume: () => void
  reset: () => void
  saveState: (slot: number) => void
  loadState: (slot: number, data: ArrayBuffer) => void
  loadLatestSaveState: (romName: string) => Promise<void>
  loadSaveStateById: (id: string) => Promise<void>
}

export function useEmulator(): UseEmulatorReturn {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const audioWorkletRef = useRef<AudioWorkletNode | null>(null)
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

    // 初始化 AudioWorklet（惰性，首次收到 FRAME 时触发）
    const initAudio = async () => {
      if (audioWorkletRef.current) return

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext({ sampleRate: 44100 })
      }
      const actx = audioCtxRef.current
      if (actx.state === 'suspended') {
        await actx.resume()
      }

      await actx.audioWorklet.addModule('/audio-processor.js')
      const workletNode = new AudioWorkletNode(actx, 'nes-audio-processor')
      workletNode.connect(actx.destination)
      audioWorkletRef.current = workletNode
    }

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
              console.log('[Main] Canvas 2D context initialized')
            }

            const ctx = ctxRef.current
            const imageData = imageDataRef.current!
            const src = new Uint8ClampedArray(msg.video)
            imageData.data.set(src)
            ctx.putImageData(imageData, 0, 0)
            scaleCanvas(canvas)

            // 诊断：采样几个像素的 RGBA 值
            if (fpsCounter.current.frames === 0) {
              const samples = []
              for (let y = 0; y < 240; y += 60) {
                for (let x = 0; x < 256; x += 64) {
                  const i = (y * 256 + x) * 4
                  samples.push(`(${x},${y})=[${imageData.data[i]},${imageData.data[i+1]},${imageData.data[i+2]},${imageData.data[i+3]}]`)
                }
              }
              console.log('[Main] Pixel samples:', samples.slice(0, 10).join(' '))
              // 检查非零字节的分布
              let rCount = 0, gCount = 0, bCount = 0, aCount = 0
              let rSum = 0, gSum = 0, bSum = 0
              for (let i = 0; i < imageData.data.length; i += 4) {
                if (imageData.data[i] > 0) { rCount++; rSum += imageData.data[i] }
                if (imageData.data[i+1] > 0) { gCount++; gSum += imageData.data[i+1] }
                if (imageData.data[i+2] > 0) { bCount++; bSum += imageData.data[i+2] }
                if (imageData.data[i+3] > 0) aCount++
              }
              console.log(`[Main] Pixel stats: R nonZero=${rCount} avg=${(rSum/rCount).toFixed(1)}, ` +
                `G nonZero=${gCount} avg=${(gSum/gCount).toFixed(1)}, ` +
                `B nonZero=${bCount} avg=${(bSum/bCount).toFixed(1)}, A nonZero=${aCount}`)
            }
          } else {
            console.warn('[Main] FRAME received but canvasRef is null!')
          }

          // 播放音频（AudioWorklet 低延迟）
          if (msg.audio.byteLength > 0) {
            initAudio()
            const samples = new Float32Array(msg.audio)
            if (samples.length > 0 && audioWorkletRef.current) {
              audioWorkletRef.current.port.postMessage(samples)
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
          const romName = romNameRef.current
          putSaveState(romName, msg.slot, msg.data)
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

  const loadLatestSaveState = useCallback(async (romName: string) => {
    const result = await getLatestSaveState(romName)
    if (result) {
      postToWorker({ type: 'LOAD_STATE', data: result.data }, [result.data])
      showNotification('读档成功 ♪')
    }
  }, [postToWorker, showNotification])

  const loadSaveStateById = useCallback(async (id: string) => {
    const result = await getSaveState(id)
    if (result) {
      postToWorker({ type: 'LOAD_STATE', data: result.data }, [result.data])
      showNotification('读档成功 ♪')
    }
  }, [postToWorker, showNotification])

  return {
    canvasRef,
    loadROM,
    loadROMFromBuffer,
    pause,
    resume,
    reset,
    saveState,
    loadState,
    loadLatestSaveState,
    loadSaveStateById,
  }
}
