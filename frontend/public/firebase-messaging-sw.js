importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js')

// Firebase web configuration is public client metadata. This must use the
// same project as the backend service account.
firebase.initializeApp({
  apiKey: 'AIzaSyAyZ-bGCFUMcjGd_TwQpNc5vtK3Rl5gamc',
  authDomain: 'grownest-f0da1.firebaseapp.com',
  projectId: 'grownest-f0da1',
  storageBucket: 'grownest-f0da1.firebasestorage.app',
  messagingSenderId: '226726545101',
  appId: '1:226726545101:web:c9b1b403aa9e3fd5894b84',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title || 'GNS Notification'
  self.registration.showNotification(title, {
    body: payload.notification?.body || '',
    icon: '/icons/logo-192x192.png',
    badge: '/icons/logo-192x192.png',
    vibrate: [200, 100, 200],
    data: payload.data || {},
  })
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const redirectUrl = event.notification.data?.redirect_url || '/'
  const targetUrl = new URL(redirectUrl, self.location.origin).href
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
      for (const client of windows) {
        if ('navigate' in client) client.navigate(targetUrl)
        return client.focus()
      }
      return clients.openWindow(targetUrl)
    }),
  )
})
