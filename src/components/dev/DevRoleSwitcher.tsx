'use client'

import { usePathname } from 'next/navigation'
import { devQuickLoginFormAction } from '@/app/(auth)/login/actions'
import { IS_DEV, type DevRole } from '@/lib/dev-auth'

const ROLES: { role: DevRole; label: string }[] = [
  { role: 'OWNER', label: '대표' },
  { role: 'COACH', label: '코치' },
  { role: 'MEMBER', label: '회원' },
]

function roleFromPath(pathname: string): DevRole | null {
  if (pathname.startsWith('/owner')) return 'OWNER'
  if (pathname.startsWith('/coach')) return 'COACH'
  if (pathname.startsWith('/member')) return 'MEMBER'
  return null
}

const ACTIVE_CLASS =
  'text-xs px-3 py-1.5 rounded-lg border border-volta bg-volta/20 text-volta font-semibold pointer-events-none'
const INACTIVE_CLASS =
  'text-xs px-3 py-1.5 rounded-lg border border-border bg-secondary text-muted-foreground hover:text-foreground hover:border-volta/30 transition-colors'

export function DevRoleSwitcher() {
  const pathname = usePathname()
  const activeRole = roleFromPath(pathname)

  if (!IS_DEV) return null

  return (
    <div className="fixed bottom-0 inset-x-0 z-20 border-t border-border bg-background/95 backdrop-blur-sm">
      <div className="max-w-screen-sm mx-auto px-5 py-3 flex items-center gap-3">
        <span className="text-[11px] text-muted-foreground shrink-0">계정변환테스트</span>
        <div className="flex gap-2">
          {ROLES.map(({ role, label }) => {
            const isActive = activeRole === role
            if (isActive) {
              return (
                <span key={role} aria-current="true" className={ACTIVE_CLASS}>
                  {label}
                </span>
              )
            }
            return (
              <form key={role} action={devQuickLoginFormAction}>
                <input type="hidden" name="role" value={role} />
                <button type="submit" className={INACTIVE_CLASS}>
                  {label}
                </button>
              </form>
            )
          })}
        </div>
      </div>
    </div>
  )
}
