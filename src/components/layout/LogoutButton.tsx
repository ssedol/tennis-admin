'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { IS_DEV, DEV_COOKIE } from '@/lib/dev-auth'

export function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    if (IS_DEV) {
      // 개발 모드: dev 쿠키 삭제
      await fetch('/api/dev/login', { method: 'DELETE' })
      router.push('/login')
      router.refresh()
      return
    }

    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      title="로그아웃"
      className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
    >
      <svg
        className="w-[18px] h-[18px]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    </button>
  )
}
