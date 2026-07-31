import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { get, patch } from '../../api/client'
import { onForegroundMessage } from '../../utils/firebase'

// Polling is the reliable fallback (5s).
// FCM provides instant real-time updates when available.
const POLL_INTERVAL = 2000 // 2 seconds (down from 5s for snappier notifications)

const TYPE_COLORS = {
  ORDER_DELIVERED: 'bg-green-500',
  ORDER_SHIPPED: 'bg-blue-500',
  ORDER_PROCESSING: 'bg-orange-400',
  ORDER_CANCELLED: 'bg-red-500',
  ORDER_PLACED: 'bg-primary-500',
  PAYMENT_APPROVED: 'bg-emerald-500',
  PAYMENT_REJECTED: 'bg-red-400',
  PAYMENT_UPLOADED: 'bg-amber-400',
}

function getTimeAgo(dateString) {
  const now = Date.now()
  const then = new Date(dateString).getTime()
  const diffMs = now - then
  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateString).toLocaleDateString()
}

function truncate(text, max = 60) {
  return text.length > max ? text.slice(0, max) + '...' : text
}

export default function NotificationBell() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const bellRef = useRef(null)
  const lastNotificationId = useRef(null)
  const initialFetchDone = useRef(false)

  // ---- Fetch latest notification (for toast on new arrivals) ----
  const checkForNewNotification = useCallback(async () => {
    if (!user) return
    const res = await get('/notifications/', { is_read: false, page_size: 1 })
    if (res.ok) {
      const list = Array.isArray(res.data) ? res.data : (res.data.results ?? [])
      if (list.length > 0) {
        const latest = list[0]
        // Show toast if this is a new notification we haven't seen yet
        // Skip on initial fetch to avoid toasting all existing notifications
        if (initialFetchDone.current && latest.id !== lastNotificationId.current) {
          showToast({ title: latest.title, message: latest.message, type: 'notification' })
        }
        lastNotificationId.current = latest.id
      }
      if (!initialFetchDone.current) {
        initialFetchDone.current = true
      }
    }
  }, [user, showToast])

  // ---- Fetch unread count ----
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return
    const res = await get('/notifications/unread_count/')
    if (res.ok) {
      setUnreadCount(res.data.count)
    }
  }, [user])

  // ---- Fetch latest notifications (for dropdown) ----
  const fetchNotifications = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const res = await get('/notifications/', { is_read: false, page_size: 5 })
    if (res.ok) {
      const list = Array.isArray(res.data) ? res.data : (res.data.results ?? [])
      setNotifications(list)
    }
    setLoading(false)
  }, [user])

  // ---- Poll for unread count + new notifications ----
  useEffect(() => {
    if (!user) return
    fetchUnreadCount()
    checkForNewNotification()
    const interval = setInterval(() => {
      fetchUnreadCount()
      checkForNewNotification()
    }, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [user, fetchUnreadCount, checkForNewNotification])

  // ---- Fetch notifications when dropdown opens ----
  useEffect(() => {
    if (open) {
      fetchNotifications()
      fetchUnreadCount()
    }
  }, [open, fetchNotifications, fetchUnreadCount])

  // ---- Listen for FCM foreground push messages ----
  useEffect(() => {
    if (!user) return
    const unsubscribe = onForegroundMessage((payload) => {
      // FCM push received — fetch fresh data from REST API immediately
      // This ensures the badge and dropdown reflect the latest state
      fetchUnreadCount()

      // If dropdown is open, refresh the notification list too
      if (open) {
        fetchNotifications()
      }

      // Update last seen notification ref via API
      checkForNewNotification()

      // Show toast notification
      if (payload.notification?.title) {
        showToast({
          title: payload.notification.title,
          message: payload.notification.body || '',
          type: 'notification',
        })
      }

      // Also try to show a browser notification (tab may be in background)
      if (payload.notification?.title && 'Notification' in window) {
        try {
          new Notification(payload.notification.title, {
            body: payload.notification.body,
            icon: '/favicon.ico',
          })
        } catch {
          // Browser notification may fail silently
        }
      }
    })
    return unsubscribe
  }, [user, open, fetchUnreadCount, fetchNotifications, checkForNewNotification, showToast])

  // ---- Close dropdown on outside click ----
  useEffect(() => {
    function handleClick(e) {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // ---- Mark single notification as read ----
  async function handleNotificationClick(notif) {
    await patch(`/notifications/${notif.id}/mark_read/`)
    setUnreadCount(prev => Math.max(0, prev - 1))
    setNotifications(prev => prev.filter(n => n.id !== notif.id))
    setOpen(false)
    if (notif.redirect_url) {
      navigate(notif.redirect_url)
    }
  }

  // ---- Mark all as read ----
  async function handleMarkAllRead() {
    await patch('/notifications/mark_all_read/')
    setUnreadCount(0)
    setNotifications([])
  }

  // ---- Don't render if not logged in ----
  if (!user) return null

  return (
    <div className="relative" ref={bellRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center w-9 h-9 rounded-full border border-beige-300 text-gray-600 hover:text-primary-600 hover:border-primary-300 transition-colors"
        aria-label="Notifications"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs min-w-[18px] h-[18px] flex items-center justify-center rounded-full font-semibold px-1 leading-none shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-80 max-sm:fixed max-sm:left-4 max-sm:right-4 max-sm:w-auto bg-white rounded-2xl shadow-lg border border-beige-200 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-beige-200">
              <h3 className="text-sm font-semibold text-gray-800">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Body */}
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-5 h-5 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-2 opacity-50">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  <span className="text-sm">No notifications yet</span>
                </div>
              ) : (
                <div className="divide-y divide-beige-100">
                  {notifications.map(notif => (
                    <button
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className="w-full text-left px-4 py-3 hover:bg-beige-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        {/* Color dot */}
                        <span
                          className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${TYPE_COLORS[notif.notification_type] || 'bg-gray-300'}`}
                        />
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{notif.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{truncate(notif.message, 80)}</p>
                          <p className="text-[11px] text-gray-400 mt-1">{getTimeAgo(notif.created_at)}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
