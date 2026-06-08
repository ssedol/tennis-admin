'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Notification = {
  id: string
  type: string
  message: string
  reference_id: string | null
  is_read: boolean
  created_at: string
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return '방금 전'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return `${Math.floor(diff / 86400)}일 전`
}

export function NotificationBell({ role }: { role: 'coach' | 'member' | 'owner' }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const fetchNotifications = useCallback(async () => {
    const res = await fetch('/api/notifications')
    if (res.ok) {
      const json = await res.json() as { notifications: Notification[] }
      setNotifications(json.notifications)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()

    // Supabase Realtime — 새 알림 실시간 반영
    const supabase = createClient()
    let userId = ''
    supabase.auth.getUser().then(({ data }) => {
      userId = data.user?.id ?? ''
      if (!userId) return
      const channel = supabase
        .channel('notifications-bell')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        }, () => fetchNotifications())
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    })

    // 30초마다 폴링 (Realtime 보완)
    const timer = setInterval(fetchNotifications, 30_000)
    return () => clearInterval(timer)
  }, [fetchNotifications])

  // 푸시 알림 상태 확인
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    setPushEnabled(Notification.permission === 'granted')
  }, [])

  // 팝업 외부 클릭 시 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function handleOpen() {
    setOpen((v) => !v)
    if (!open && notifications.length > 0) {
      // 팝업 열면 전체 읽음 처리
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
    }
  }

  async function handleNotificationClick(n: Notification) {
    setOpen(false)
    if (n.reference_id) {
      router.push(`/${role}/lessons/${n.reference_id}`)
    }
    setNotifications((prev) => prev.filter((x) => x.id !== n.id))
  }

  async function enablePush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('이 브라우저는 푸시 알림을 지원하지 않습니다')
      return
    }
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return
    setPushEnabled(true)

    try {
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      const sub = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      })
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint, keys: { p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')!))), auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')!))) } }),
      })
    } catch (e) {
      console.error('Push subscription failed', e)
    }
  }

  const unreadCount = notifications.length

  return (
    <div className="relative" ref={popupRef}>
      <button
        onClick={handleOpen}
        title="알림"
        className="relative w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      >
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-volta text-black text-[9px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-[#141414] border border-[#222] rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#222]">
            <span className="text-sm font-semibold">알림</span>
            {unreadCount > 0 && (
              <span className="text-xs text-muted-foreground">{unreadCount}개 읽지 않음</span>
            )}
          </div>

          {pushEnabled === false && (
            <div className="px-4 py-3 border-b border-[#222] bg-volta-muted/20">
              <p className="text-xs text-muted-foreground mb-2">앱을 닫아도 알림을 받으려면 푸시를 켜세요</p>
              <button
                onClick={enablePush}
                className="text-xs px-3 py-1.5 rounded-lg bg-volta text-black font-semibold hover:opacity-90 transition-opacity"
              >
                푸시 알림 켜기
              </button>
            </div>
          )}

          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">읽지 않은 알림이 없습니다</div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className="w-full text-left px-4 py-3 hover:bg-[#1e1e1e] transition-colors border-b border-[#1a1a1a] last:border-0"
                >
                  <p className="text-sm text-foreground leading-snug">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
