import { useCallback, useRef, useState } from 'react'
import { useEmulator } from './hooks/useEmulator'
import { useInput } from './hooks/useInput'
import { useGamepad } from './hooks/useGamepad'
import { useEmulatorStore } from './store/emulatorStore'
import GameCanvas from './components/GameCanvas'
import FloatingControls from './components/FloatingControls'
import FPSDisplay from './components/FPSDisplay'
import NotificationToast from './components/NotificationToast'
import TouchGamepad from './components/TouchGamepad'
import SettingsModal from './components/SettingsModal'
import './App.css'

export default function App() {
  const {
    canvasRef,
    loadROM,
    loadROMFromLibrary,
    deleteROMFromLibrary,
    pause,
    resume,
    reset,
    saveState,
  } = useEmulator()

  const status = useEmulatorStore((s) => s.status)
  const currentROM = useEmulatorStore((s) => s.currentROM)
  const recentROMs = useEmulatorStore((s) => s.recentROMs)
  const setControlsVisible = useEmulatorStore((s) => s.setControlsVisible)

  const kbStateRef = useRef(0)
  const gpStateRef = useRef(0)
  const touchStateRef = useRef(0)

  const dispatchMergedInput = useCallback(() => {
    const merged = kbStateRef.current | gpStateRef.current | touchStateRef.current
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

  const handleTouchInput = useCallback((state: number) => {
    touchStateRef.current = state
    dispatchMergedInput()
  }, [dispatchMergedInput])

  useInput(handleKeyboardInput)
  useGamepad(true, handleGamepadInput)

  const handleFullscreen = useCallback(() => {
    const el = document.documentElement
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      el.requestFullscreen({})
    }
  }, [])

  const [settingsOpen, setSettingsOpen] = useState(false)

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

  const handleDropROM = useCallback((file: File) => {
    loadROM(file)
  }, [loadROM])

  const formatFileSize = (size: number) => {
    if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`
    return `${Math.max(1, Math.round(size / 1024))} KB`
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="app" onMouseMove={handleInteraction} onTouchStart={handleInteraction}>
      {/* Header */}
      <header className="app__header">
        <span className="app__header-title">◆ NES_PLAYER v2.0 ◆</span>
      </header>

      <div className="app__content">
        {status === 'idle' && (
          <div className="app__idle">
            <div className="app__idle-card">
              <div className="app__idle-icon">🖥️</div>
              <h2 className="app__idle-title">NES_PLAYER</h2>
              <p className="app__idle-subtitle">DROP .NES FILE // INIT SEQUENCE</p>

              <div className="app__idle-dropzone">
                READY FOR INPUT...
              </div>

              <div className="app__idle-actions">
                <label className="btn-primary">
                  ◆ SELECT FILE
                  <input
                    type="file"
                    accept=".nes,.NES"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) loadROM(file)
                      e.currentTarget.value = ''
                    }}
                  />
                </label>
                {recentROMs.length > 0 && (
                  <button
                    className="btn-ghost"
                    type="button"
                    onClick={() => {
                      const list = document.querySelector('.app__recent')
                      if (list) list.scrollIntoView({ behavior: 'smooth' })
                    }}
                  >
                    RECENT ROMS ↓
                  </button>
                )}
              </div>

              {recentROMs.length > 0 && (
                <section className="app__recent">
                  <div className="app__recent-header">
                    <h3>ROM LIBRARY</h3>
                    <span>{recentROMs.length} files</span>
                  </div>
                  <div className="app__recent-list">
                    {recentROMs.map((rom) => (
                      <button
                        key={rom.name}
                        className="app__recent-row"
                        type="button"
                        onClick={() => void loadROMFromLibrary(rom.name)}
                      >
                        <span className="app__recent-main">
                          <span className="app__recent-name">{rom.name}</span>
                          <span className="app__recent-meta">
                            {formatFileSize(rom.size)} · {formatDate(rom.createdAt)}
                          </span>
                        </span>
                        <span
                          className="app__recent-delete"
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation()
                            void deleteROMFromLibrary(rom.name)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              e.stopPropagation()
                              void deleteROMFromLibrary(rom.name)
                            }
                          }}
                          aria-label={`Delete ${rom.name}`}
                        >
                          DEL
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        )}

        {status === 'loading' && (
          <div className="app__loading">
            <p className="app__loading-text">LOADING... ♪</p>
          </div>
        )}

        {(status === 'running' || status === 'paused') && (
          <div className="app__game">
            <div className="app__game-hud">
              <span style={{ color: 'var(--color-accent)' }}>FPS: —</span>
              <span style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: '9px' }}>
                {currentROM?.name ?? '—'}
              </span>
              <span style={{ color: 'var(--color-accent)' }}>
                {status === 'running' ? '▶ RUN' : '⏸ PAUSE'}
              </span>
            </div>

            <div className="app__game-stage">
              <GameCanvas canvasRef={canvasRef} onDropROM={handleDropROM} />
            </div>

            <div className="app__gamepad-area">
              <TouchGamepad onInput={handleTouchInput} />
            </div>

            <div className="app__toolbar-area">
              <FloatingControls
                onPause={pause}
                onResume={resume}
                onReset={reset}
                onSaveState={saveState}
                onFullscreen={handleFullscreen}
                onTouchInput={handleTouchInput}
              />
            </div>
          </div>
        )}
      </div>

      {/* Status Ticker */}
      <div className="app__ticker">
        <span className="app__ticker-text">
          SYS.OK // GRID.CONNECTED // NEON.STABLE // READY
        </span>
      </div>

      <FPSDisplay />
      <NotificationToast />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onResetData={() => {
          setSettingsOpen(false)
        }}
      />
    </div>
  )
}
