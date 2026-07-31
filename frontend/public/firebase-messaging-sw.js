/**
 * Firebase Cloud Messaging Service Worker
 *
 * This file must be at the root of the web app so Firebase SDK can find it.
 * It handles background push messages (when the tab is not focused).
 * Foreground messages are handled by the onMessage listener in the app.
 *
 * The Firebase config is injected by src/main.jsx via self.__FIREBASE_CONFIG__
 * before this service worker is registered.
 */
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js')

const config = self.__FIREBASE_CONFIG__
if (config) {
  firebase.initializeApp(config)
  const messaging = firebase.messaging()

  messaging.onBackgroundMessage(function (payload) {
    const title = payload.notification?.title || 'GNS Notification'
    const options = {
      body: payload.notification?.body || '',
      icon: '/icons/logo-192x192.png',
      badge: '/icons/logo-192x192.png',
      vibrate: [200, 100, 200],
    }
    self.registration.showNotification(title, options)
  })
}
