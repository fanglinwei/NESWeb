import { useEffect } from 'react'
import { useEmulatorStore } from '../store/emulatorStore'

export default function NotificationToast() {
  const notification = useEmulatorStore((s) => s.notification)
  const dismissNotification = useEmulatorStore((s) => s.dismissNotification)

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(dismissNotification, 2500)
      return () => clearTimeout(timer)
    }
  }, [notification, dismissNotification])

  if (!notification) return null

  return (
    <div
      style={{
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '10px 24px',
        background: 'rgba(255, 102, 153, 0.95)',
        color: '#fff',
        borderRadius: '30px',
        fontSize: '14px',
        fontWeight: 600,
        boxShadow: '0 4px 16px rgba(255, 102, 153, 0.4)',
        zIndex: 100,
        animation: 'toastIn 0.3s ease',
      }}
    >
      {notification}
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}
