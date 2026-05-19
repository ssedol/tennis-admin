import { cookies } from 'next/headers'
import { DEV_PROFILES } from '@/lib/dev-auth'

export default async function MemberPage() {
  const cookieStore = await cookies()
  const devRole = cookieStore.get('x-dev-role')?.value
  const profile = devRole ? DEV_PROFILES['MEMBER'] : null

  return (
    <main className="max-w-screen-sm mx-auto px-5 pb-10">
      <header className="flex items-center justify-between py-5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-volta" />
          <span className="font-semibold text-[15px]">테니스 관리</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center text-xs text-muted-foreground">
          {profile?.name?.[0] ?? '회'}
        </div>
      </header>

      {/* 다음 레슨 */}
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">다음 레슨</p>
      <div className="bg-card border border-volta/15 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xl font-bold tracking-tight">내일 10:00</p>
            <p className="text-xs text-muted-foreground mt-1">코치 김민준 · 코트 A · 60분</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">5월 20일 수요일</p>
            <p className="text-[11px] text-volta font-medium mt-1">D-1</p>
          </div>
        </div>
      </div>

      {/* 지난 레슨 */}
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">지난 레슨</p>
      <div className="space-y-2 mb-6">
        {[
          { date: '5월 19일 10:00', coach: '코치 김민준 · 코트 A', feedback: '피드백 1개 · 영상 1개' },
          { date: '5월 15일 10:00', coach: '코치 김민준 · 코트 A', feedback: '피드백 1개' },
        ].map((item) => (
          <div key={item.date} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-semibold">{item.date}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.coach}</p>
              </div>
              <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400">완료</span>
            </div>
            <div className="h-px bg-border mb-3" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{item.feedback}</span>
              <button className="text-xs px-3 py-1.5 rounded-lg border border-border bg-secondary text-muted-foreground hover:text-foreground transition-colors">확인</button>
            </div>
          </div>
        ))}
      </div>

      {/* 테니스 일지 */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">테니스 일지</p>
        <button className="text-xs px-3 py-1.5 rounded-lg border border-border bg-secondary text-muted-foreground hover:text-foreground transition-colors">+ 기록 추가</button>
      </div>
      <div className="space-y-2">
        {[
          { dot: 'bg-volta', type: '레슨', typeClass: 'text-volta', date: '5월 19일', content: '백핸드 집중 레슨. 팔꿈치 교정 중.' },
          { dot: 'bg-blue-400', type: '자율 연습', typeClass: 'text-blue-400', date: '5월 16일', content: '서비스 토스 30분 반복. 점점 안정됨.' },
          { dot: 'bg-red-400', type: '경기', typeClass: 'text-red-400', date: '5월 14일', content: '클럽 내부 대회 6-4 승. 백핸드 실수 多.' },
        ].map((item) => (
          <div key={item.date} className="bg-card border border-border rounded-xl p-4 flex gap-3">
            <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${item.dot}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-semibold ${item.typeClass}`}>{item.type}</span>
                <span className="text-[11px] text-muted-foreground">{item.date}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 개발용 역할 전환 */}
      <div className="mt-10 pt-5 border-t border-border">
        <p className="text-[11px] text-muted-foreground mb-2">개발 테스트 — 역할 전환</p>
        <div className="flex gap-2">
          <a href="/api/dev/login?role=OWNER" className="text-xs px-3 py-1.5 rounded-lg border border-border bg-secondary text-muted-foreground hover:text-foreground transition-colors">대표</a>
          <a href="/api/dev/login?role=COACH" className="text-xs px-3 py-1.5 rounded-lg border border-border bg-secondary text-muted-foreground hover:text-foreground transition-colors">코치</a>
          <a href="/api/dev/login?role=MEMBER" className="text-xs px-3 py-1.5 rounded-lg border border-volta/30 bg-volta-muted text-volta">회원</a>
        </div>
      </div>
    </main>
  )
}
