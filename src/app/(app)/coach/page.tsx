import { cookies } from 'next/headers'
import { DEV_PROFILES } from '@/lib/dev-auth'

export default async function CoachPage() {
  const cookieStore = await cookies()
  const devRole = cookieStore.get('x-dev-role')?.value
  const profile = devRole ? DEV_PROFILES['COACH'] : null

  return (
    <main className="max-w-screen-sm mx-auto px-5 pb-10">
      <header className="flex items-center justify-between py-5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-volta" />
          <span className="font-semibold text-[15px]">테니스 관리</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center text-xs text-muted-foreground">
          {profile?.name?.[0] ?? '코'}
        </div>
      </header>

      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">오늘 · 5월 19일</h1>
        <p className="text-sm text-muted-foreground mt-1">화요일 · 레슨 4건</p>
      </div>

      {/* 진행 중 */}
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">진행 중</p>
      <div className="bg-card border border-volta/20 rounded-xl p-4 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm font-semibold">10:00 — 11:00</p>
            <p className="text-xs text-muted-foreground mt-0.5">코트 A</p>
          </div>
          <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-volta-muted text-volta">진행 중</span>
        </div>
        <div className="h-px bg-border mb-4" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center text-[11px] text-muted-foreground">이</div>
            <div>
              <p className="text-sm font-medium">이수진</p>
              <p className="text-xs text-muted-foreground">중급 · 주 2회</p>
            </div>
          </div>
          <button className="text-xs px-3 py-1.5 rounded-lg border border-border bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            레슨 종료
          </button>
        </div>
      </div>

      {/* 예정 */}
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">예정</p>
      <div className="space-y-2 mb-6">
        {[
          { time: '11:00 — 12:00', court: '코트 B', name: '박준영', level: '초급 · 주 3회', initial: '박' },
          { time: '14:00 — 15:00', court: '코트 A', name: '최민서', level: '고급 · 주 1회', initial: '최' },
        ].map((item) => (
          <div key={item.name} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-semibold">{item.time}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.court}</p>
              </div>
              <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-secondary text-muted-foreground">예정</span>
            </div>
            <div className="h-px bg-border mb-4" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center text-[11px] text-muted-foreground">{item.initial}</div>
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.level}</p>
                </div>
              </div>
              <button className="text-xs px-3 py-1.5 rounded-lg bg-volta text-black font-semibold hover:opacity-90 transition-opacity">
                레슨 시작
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 완료 */}
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">완료</p>
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm font-semibold">09:00 — 10:00</p>
            <p className="text-xs text-muted-foreground mt-0.5">코트 C</p>
          </div>
          <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400">완료</span>
        </div>
        <div className="h-px bg-border mb-4" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center text-[11px] text-muted-foreground">정</div>
            <div>
              <p className="text-sm font-medium">정하늘</p>
              <p className="text-xs text-muted-foreground">중급 · 주 2회</p>
            </div>
          </div>
          <button className="text-xs px-3 py-1.5 rounded-lg border border-border bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            피드백 보기
          </button>
        </div>
      </div>

      {/* 개발용 역할 전환 */}
      <div className="mt-10 pt-5 border-t border-border">
        <p className="text-[11px] text-muted-foreground mb-2">개발 테스트 — 역할 전환</p>
        <div className="flex gap-2">
          <a href="/api/dev/login?role=OWNER" className="text-xs px-3 py-1.5 rounded-lg border border-border bg-secondary text-muted-foreground hover:text-foreground transition-colors">대표</a>
          <a href="/api/dev/login?role=COACH" className="text-xs px-3 py-1.5 rounded-lg border border-volta/30 bg-volta-muted text-volta">코치</a>
          <a href="/api/dev/login?role=MEMBER" className="text-xs px-3 py-1.5 rounded-lg border border-border bg-secondary text-muted-foreground hover:text-foreground transition-colors">회원</a>
        </div>
      </div>
    </main>
  )
}
