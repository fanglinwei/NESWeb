import { useEffect, useRef, useCallback } from 'react'
import './SettingsModal.css'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  onResetData: () => void
}

export default function SettingsModal({ open, onClose, onResetData }: SettingsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Focus trap + Escape to close
  useEffect(() => {
    if (!open) return

    previousFocusRef.current = document.activeElement as HTMLElement

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    // Focus first focusable element in modal
    const timer = setTimeout(() => {
      const first = modalRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      first?.focus()
    }, 100)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      clearTimeout(timer)
      previousFocusRef.current?.focus()
    }
  }, [open, onClose])

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }, [onClose])

  if (!open) return null

  const settingsSections = [
    {
      title: 'VIDEO',
      rows: [
        { label: 'Scale', value: '2x' },
        { label: 'Scanlines', value: 'ON' },
        { label: 'CRT Filter', value: 'OFF' },
      ],
    },
    {
      title: 'AUDIO',
      rows: [
        { label: 'Volume', value: '80%' },
        { label: 'Sample Rate', value: '44100 Hz' },
      ],
    },
    {
      title: 'CONTROLS',
      rows: [
        { label: 'Keyboard Map', value: 'Default' },
        { label: 'Gamepad', value: 'Enabled' },
      ],
    },
    {
      title: 'DATA',
      rows: [
        { label: 'Save Slot', value: 'Slot 1' },
        { label: 'ROM Library', value: '12 files' },
      ],
    },
  ]

  return (
    <div
      className="settings-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <div className="settings-modal" ref={modalRef}>
        <div className="settings-modal__header">
          <h2 className="settings-modal__title">⚙ SYSTEM_CONFIG</h2>
          <button
            className="settings-modal__close"
            onClick={onClose}
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        <div className="settings-modal__body">
          {settingsSections.map((section) => (
            <div key={section.title} className="settings-modal__section">
              <div className="settings-modal__section-title">{section.title}</div>
              {section.rows.map((row) => (
                <div
                  key={row.label}
                  className="settings-modal__row"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                    }
                  }}
                >
                  <span className="settings-modal__row-label">{row.label}</span>
                  <span className="settings-modal__row-value">{row.value}</span>
                </div>
              ))}
              <div className="settings-modal__divider" />
            </div>
          ))}

          {/* Danger Zone */}
          <div className="settings-modal__danger">
            <div className="settings-modal__danger-title">⚠ DANGER ZONE</div>
            <button
              className="settings-modal__danger-btn"
              onClick={() => {
                if (window.confirm('Reset all save data? This cannot be undone.')) {
                  onResetData()
                }
              }}
            >
              RESET ALL DATA
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
