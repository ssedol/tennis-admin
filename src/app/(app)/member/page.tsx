import { LogoutButton } from '@/components/layout/LogoutButton'
import { MemberClient } from '@/components/member/MemberClient'

export default async function MemberPage() {
  return (
    <main className="max-w-screen-sm mx-auto px-5 pb-10">
      <header className="flex items-center justify-between py-5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-volta" />
          <span className="font-semibold text-[15px]">테니스 관리</span>
        </div>
        <LogoutButton />
      </header>

      <MemberClient />

      {/* 개발용 역할 전환 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-10 pt-5 border-t border-border">
          <p className="text-[11px] text-muted-foreground mb-2">개발 테스트 — 역할 전환</p>
          <div className="flex gap-2">
            <a href="/api/dev/login?role=OWNER" className="text-xs px-3 py-1.5 rounded-lg border border-border bg-secondary text-muted-foreground hover:text-foreground transition-colors">대표</a>
            <a href="/api/dev/login?role=COACH" className="text-xs px-3 py-1.5 rounded-lg border border-border bg-secondary text-muted-foreground hover:text-foreground transition-colors">코치</a>
            <a href="/api/dev/login?role=MEMBER" className="text-xs px-3 py-1.5 rounded-lg border border-volta/30 bg-volta/10 text-volta">회원</a>
          </div>
        </div>
      )}
    </main>
  )
}
