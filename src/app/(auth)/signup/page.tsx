'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signupAction } from './actions'

export default function SignupPage() {
  const [error, action, pending] = useActionState(signupAction, null)

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
          <h1 className="text-xl font-bold tracking-tight">코치 가입</h1>
          <p className="text-sm text-muted-foreground mt-1">계정을 만들고 레슨을 관리하세요</p>
        </div>
      </div>

      {/* 가입 폼 */}
      <div className="w-full max-w-sm bg-card border border-border rounded-xl p-6">
        <form action={action} className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block" htmlFor="name">
              이름
            </label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="홍길동"
              required
              className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-volta transition-colors"
            />
          </div>

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
              placeholder="6자 이상"
              required
              autoComplete="new-password"
              className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-volta transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block" htmlFor="passwordConfirm">
              비밀번호 확인
            </label>
            <input
              id="passwordConfirm"
              name="passwordConfirm"
              type="password"
              placeholder="비밀번호 재입력"
              required
              autoComplete="new-password"
              className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-volta transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full py-2.5 rounded-lg bg-volta text-black text-sm font-semibold tracking-tight disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {pending ? '가입 중...' : '코치로 시작하기'}
          </button>
        </form>
      </div>

      <p className="mt-5 text-xs text-muted-foreground text-center">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="text-volta underline underline-offset-2">
          로그인
        </Link>
      </p>
    </main>
  )
}
