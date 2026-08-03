import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

/** Lazy init — only attempt Messaging if the browser supports it. */
let _messaging = null
function getMessagingInstance() {
  if (_messaging) return _messaging
  try {
    _messaging = getMessaging(app)
  } catch (err) {
    console.warn('Firebase Messaging not available in this browser:', err.message)
    _messaging = null
  }
  return _messaging
}

/**
 * Request browser notification permission and get the FCM token.
 * Call this after login.
 *
 * @returns {Promise<string|null>} The FCM token, or null if permission denied.
 */
export async function requestFcmToken() {
  try {
    const messaging = getMessagingInstance()
    if (!messaging) return null

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.warn('Notification permission denied')
      return null
    }

    const serviceWorkerRegistration = await navigator.serviceWorker.register(
      '/firebase-messaging-sw.js',
      { scope: '/', updateViaCache: 'none' },
    )
    const options = { serviceWorkerRegistration }
    if (import.meta.env.VITE_FIREBASE_VAPID_KEY) {
      options.vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY
    }
    const token = await getToken(messaging, options)
    return token
  } catch (err) {
    console.error('FCM token request failed:', err)
    return null
  }
}

/**
 * Listen for foreground push messages.
 * Fires a callback when a notification arrives while the app tab is open.
 *
 * @param {function} callback - Receives the payload object.
 * @returns {function|null} Unsubscribe function to stop listening, or null if unavailable.
 */
export function onForegroundMessage(callback) {
  const messaging = getMessagingInstance()
  if (!messaging) return null
  return onMessage(messaging, callback)
}
