import { useCallback, useRef } from 'react'
import { useEmulator } from './hooks/useEmulator'
import { useInput } from './hooks/useInput'
import { useGamepad } from './hooks/useGamepad'
import { useEmulatorStore } from './store/emulatorStore'
import GameCanvas from './components/GameCanvas'
import FloatingControls from './components/FloatingControls'
import NotificationToast from './components/NotificationToast'
import './App.css'

export default function App() {
  const {
    canvasRef,
    loadROM,
    pause,
    resume,
    reset,
    saveState,
  } = useEmulator()

  const status = useEmulatorStore((s) => s.status)
  const setControlsVisible = useEmulatorStore((s) => s.setControlsVisible)

  // 键盘 + 手柄输入合并
  // 两个输入源各自维护自己的状态，合并后统一发送
  const kbStateRef = useRef(0)
  const gpStateRef = useRef(0)

  const dispatchMergedInput = useCallback(() => {
    const merged = kbStateRef.current | gpStateRef.current
    window.dispatchEvent(new CustomEvent('nes-input', { detail: merged }))
  }, [])

  const handleKeyboardInput = useCallback((state: number) => {
    kbStateRef.current = state
    dispatchMergedInput()
  }, [dispatchMergedInput])

  const handleGamepadInput = useCallback((state: number) => {
    gpStateRef.current = state
    dispatchMergedInput()
  }, [dispatchMergedInput])

  useInput(handleKeyboardInput)
  useGamepad(true, handleGamepadInput)

  // 全屏切换
  const handleFullscreen = useCallback(() => {
    const el = document.documentElement
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      el.requestFullscreen({})
    }
  }, [])

  // 鼠标/触摸移动时显示控制栏，3 秒后自动隐藏
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const handleInteraction = useCallback(() => {
    setControlsVisible(true)
    clearTimeout(hideControlsTimer.current)
    hideControlsTimer.current = setTimeout(() => {
      if (status === 'running') {
        setControlsVisible(false)
      }
    }, 3000)
  }, [status, setControlsVisible])

  // ROM 拖放处理
  const handleDropROM = useCallback((file: File) => {
    loadROM(file)
  }, [loadROM])

  return (
    <div className="app" onMouseMove={handleInteraction} onTouchStart={handleInteraction}>
      {/* 空状态：提示加载 ROM */}
      {status === 'idle' && (
        <div className="app__dropzone">
          <div className="soft-card app__dropzone-card">
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎮</div>
            <h2 style={{ color: 'var(--pink)', marginBottom: '8px' }}>NES Player</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              拖放 .nes 文件到此处开始游戏 ♪
            </p>
            <label className="soft-button soft-button--pink" style={{ marginTop: '16px', cursor: 'pointer' }}>
              选择文件
              <input
                type="file"
                accept=".nes,.NES"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) loadROM(file)
                }}
              />
            </label>
          </div>
        </div>
      )}

      {/* 加载状态 */}
      {status === 'loading' && (
        <div className="app__loading">
          <p style={{ color: 'var(--pink)' }}>加载中... ♪</p>
        </div>
      )}

      {/* 游戏画面（running 或 paused） */}
      {(status === 'running' || status === 'paused') && (
        <div className="app__game">
          <GameCanvas canvasRef={canvasRef} onDropROM={handleDropROM} />
        </div>
      )}

      {/* 浮动控制栏 */}
      <FloatingControls
        onPause={pause}
        onResume={resume}
        onReset={reset}
        onSaveState={saveState}
        onFullscreen={handleFullscreen}
      />

      {/* 提示 */}
      <NotificationToast />
    </div>
  )
}
