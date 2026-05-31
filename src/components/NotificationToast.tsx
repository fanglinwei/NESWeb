import { useEffect } from 'react'
import { useEmulatorStore } from '../store/emulatorStore'
import './NotificationToast.css'

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
    <div className="notification-toast" role="status" aria-live="polite">
      {notification}
    </div>
  )
}
