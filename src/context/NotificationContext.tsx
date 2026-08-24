import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'

type NotificationType = 'success' | 'warning' | 'error' | 'info'

interface Notification {
  id: number
  type: NotificationType
  title: string
  message: string
  time: string
}

interface NotificationContextType {
  notifications: Notification[]
  addNotification: (type: NotificationType, title: string, message: string) => void
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

let sharedAudioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (sharedAudioCtx) return sharedAudioCtx
  try {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext
    if (!Ctor) return null
    sharedAudioCtx = new Ctor()
    return sharedAudioCtx
  } catch {
    return null
  }
}

const playNotificationSound = (type: NotificationType) => {
  try {
    const audioCtx = getAudioContext()
    if (!audioCtx) return
    const oscillator = audioCtx.createOscillator()
    const gainNode = audioCtx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioCtx.destination)

    // Sonidos agradables y sutiles según el tipo
    if (type === 'success') {
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime) // La4
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3)
      oscillator.start(audioCtx.currentTime)
      oscillator.stop(audioCtx.currentTime + 0.3)
    } else if (type === 'warning') {
      oscillator.frequency.setValueAtTime(660, audioCtx.currentTime) // Mi4
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5)
      oscillator.start(audioCtx.currentTime)
      oscillator.stop(audioCtx.currentTime + 0.5)
    } else {
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime) // La3
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4)
      oscillator.start(audioCtx.currentTime)
      oscillator.stop(audioCtx.currentTime + 0.4)
    }

    // Vibración en dispositivos móviles
    if (navigator.vibrate) {
      navigator.vibrate(type === 'success' ? 50 : [30, 50, 30])
    }
  } catch (e) {
    // Silenciosamente ignorar si el audio no está disponible
  }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const idCounter = useRef(0)

  const addNotification = useCallback((type: NotificationType, title: string, message: string) => {
    idCounter.current += 1
    const newNotif: Notification = {
      id: idCounter.current,
      type,
      title,
      message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    setNotifications(prev => [newNotif, ...prev].slice(0, 10))
    playNotificationSound(type)
  }, [])

  const clearAll = useCallback(() => setNotifications([]), [])

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, clearAll }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) throw new Error('useNotifications must be used within NotificationProvider')
  return context
}
