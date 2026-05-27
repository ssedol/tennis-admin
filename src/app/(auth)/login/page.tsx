'use client'

import { useActionState } from 'react'
import { devQuickLoginAction, loginAction } from './actions'

const IS_DEV = process.env.NODE_ENV === 'development'

const DEV_ROLES = [
  { role: 'OWNER' as const, label: '대표' },
  { role: 'COACH' as const, label: '코치' },
  { role: 'MEMBER' as const, label: '회원' },
]

export default function LoginPage() {
  const [error, action, pending] = useActionState(loginAction, null)
  const [devError, devAction, devPending] = useActionState(devQuickLoginAction, null)
  const displayError = error ?? devError
  const isPending = pending || devPending

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      {/* 로고 */}
      <div className="flex flex-col items-center gap-3 mb-10">
        <div className="w-14 h-14 rounded-2xl bg-card border border-border flex items-center justify-center">
          <div className="w-7 h-7 rounded-full bg-volta relative">
            <span className="absolute inset-x-0 top-[45%] h-px bg-black/20 rounded-full" />
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold tracking-tight">테니스 관리</h1>
          <p className="text-sm text-muted-foreground mt-1">이메일과 비밀번호로 로그인하세요</p>
        </div>
      </div>

      {/* 로그인 폼 */}
      <div className="w-full max-w-sm bg-card border border-border rounded-xl p-6">
        <form action={action} className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block" htmlFor="email">
              이메일
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="email@example.com"
              required
              autoComplete="email"
              className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-volta transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block" htmlFor="password">
              비밀번호
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-volta transition-colors"
            />
          </div>

          {displayError && (
            <p className="text-xs text-destructive">{displayError}</p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 rounded-lg bg-volta text-black text-sm font-semibold tracking-tight disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {pending ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>

      <p className="mt-5 text-xs text-muted-foreground text-center">
        계정이 없으신가요?<br />
        대표 또는 코치에게 문의해주세요.
      </p>

      {/* 개발 환경 전용 */}
      {IS_DEV && (
        <div className="w-full max-w-sm mt-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">계정변환테스트</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {DEV_ROLES.map(({ role, label }) => (
              <form key={role} action={devAction}>
                <input type="hidden" name="role" value={role} />
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-2 text-center text-xs font-medium rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {devPending ? '...' : label}
                </button>
              </form>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
