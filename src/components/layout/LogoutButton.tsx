'use client'

import { logoutAction } from '@/app/(auth)/login/actions'
import { IS_DEV } from '@/lib/dev-auth'

export function LogoutButton() {
  async function handleLogout() {
    if (IS_DEV) {
      window.location.href = '/login'
      return
    }
    await logoutAction()
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
