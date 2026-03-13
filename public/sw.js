// SabreAI SmartCampus Service Worker
const CACHE = 'sabreai-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', () => clients.claim())

// Handle push notifications (lock screen)
self.addEventListener('push', e => {
  const data = e.data?.json() || {}
  e.waitUntil(
    self.registration.showNotification(data.title || 'SabreAI SmartCampus', {
      body:    data.body || 'You have a new notification',
      icon:    '/icons/icon-192.png',
      badge:   '/icons/icon-192.png',
      vibrate: [300, 100, 300, 100, 300],
      tag:     data.tag || 'sabreai',
      data:    { url: data.url || '/dashboard' },
    })
  )
})

// Open app on notification click
self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = e.notification.data?.url || '/dashboard'
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(self.location.origin)) {
          client.focus(); client.navigate(url); return
        }
      }
      return clients.openWindow(url)
    })
  )
})
