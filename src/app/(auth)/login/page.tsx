'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const IS_DEV = process.env.NODE_ENV === 'development'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    })

    if (error) {
      setError('이메일 발송에 실패했습니다. 다시 시도해주세요.')
    } else {
      setSent(true)
    }
    setLoading(false)
  }

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
          <p className="text-sm text-muted-foreground mt-1">
            {sent ? '이메일을 확인해주세요' : '초대받은 이메일로 로그인하세요'}
          </p>
        </div>
      </div>

      {/* 카드 */}
      <div className="w-full max-w-sm bg-card border border-border rounded-xl p-6">
        {sent ? (
          <div className="text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-volta-muted border border-volta/20 flex items-center justify-center mx-auto">
              <svg className="w-5 h-5 text-volta" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium">{email}</p>
              <p className="text-xs text-muted-foreground mt-1">
                로그인 링크를 발송했습니다. 링크는 24시간 유효합니다.
              </p>
            </div>
            <button
              onClick={() => { setSent(false); setEmail('') }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              다른 이메일로 시도
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground font-medium" htmlFor="email">
                이메일 주소
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-volta transition-colors"
              />
            </div>

            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-2.5 rounded-lg bg-volta text-black text-sm font-semibold tracking-tight disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              {loading ? '발송 중...' : '매직 링크 발송'}
            </button>
          </form>
        )}
      </div>

      <p className="mt-5 text-xs text-muted-foreground text-center">
        초대 이메일을 받지 못하셨나요?<br />
        코치 또는 관리자에게 문의해주세요.
      </p>

      {/* 개발 환경 전용 테스트 로그인 */}
      {IS_DEV && (
        <div className="w-full max-w-sm mt-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">개발 테스트</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['OWNER', 'COACH', 'MEMBER'] as const).map((role) => (
              <a
                key={role}
                href={`/api/dev/login?role=${role}`}
                className="py-2 text-center text-xs font-medium rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors"
              >
                {role === 'OWNER' ? '대표' : role === 'COACH' ? '코치' : '회원'}
              </a>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
