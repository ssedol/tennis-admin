'use client'

import { useEffect } from 'react'

export function PushSubscriber() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // 이미 알림 허용 + 구독 없으면 자동 구독
        if (Notification.permission !== 'granted') return
        return reg.pushManager.getSubscription().then(async (existing) => {
          if (existing) return  // 이미 구독 중
          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
          })
          await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              endpoint: sub.endpoint,
              keys: {
                p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')!))),
                auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')!))),
              },
            }),
          })
        })
      })
      .catch(() => {})
  }, [])

  return null
}
