import { OwnerNav } from '@/components/owner/OwnerNav'
import { LogoutButton } from '@/components/layout/LogoutButton'

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="max-w-screen-sm mx-auto px-5 flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-volta" />
            <span className="font-semibold text-[15px]">테니스 관리</span>
          </div>
          <LogoutButton />
        </div>
        <OwnerNav />
      </header>

      <main className="max-w-screen-sm mx-auto px-5 pt-5 pb-20">
        {children}
      </main>

      {/* 개발용 역할 전환 */}
      <div className="fixed bottom-0 inset-x-0 border-t border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-screen-sm mx-auto px-5 py-3 flex items-center gap-3">
          <span className="text-[11px] text-muted-foreground shrink-0">개발 테스트</span>
          <div className="flex gap-2">
            <a href="/api/dev/login?role=OWNER" className="text-xs px-3 py-1.5 rounded-lg border border-volta/30 bg-volta-muted text-volta">대표</a>
            <a href="/api/dev/login?role=COACH" className="text-xs px-3 py-1.5 rounded-lg border border-border bg-secondary text-muted-foreground hover:text-foreground transition-colors">코치</a>
            <a href="/api/dev/login?role=MEMBER" className="text-xs px-3 py-1.5 rounded-lg border border-border bg-secondary text-muted-foreground hover:text-foreground transition-colors">회원</a>
          </div>
        </div>
      </div>
    </div>
  )
}
