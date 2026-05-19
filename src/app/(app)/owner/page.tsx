import { cookies } from 'next/headers'
import { DEV_PROFILES } from '@/lib/dev-auth'

export default async function OwnerPage() {
  // 개발: dev 쿠키에서 프로필 읽기
  const cookieStore = await cookies()
  const devRole = cookieStore.get('x-dev-role')?.value
  const profile = devRole ? DEV_PROFILES['OWNER'] : null

  return (
    <main className="max-w-screen-sm mx-auto px-5 pb-10">
      <header className="flex items-center justify-between py-5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-volta" />
          <span className="font-semibold text-[15px]">테니스 관리</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center text-xs text-muted-foreground">
          {profile?.name?.[0] ?? '대'}
        </div>
      </header>

      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">5월 현황</h1>
        <p className="text-sm text-muted-foreground mt-1">2026년 · 전체 코치</p>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-3 gap-2.5 mb-6">
        {[
          { value: '84', label: '이번달 레슨' },
          { value: '3', label: '코치', accent: true },
          { value: '21', label: '회원' },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-3.5 text-center">
            <p className={`text-2xl font-bold tracking-tight ${s.accent ? 'text-volta' : ''}`}>{s.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* 오늘 일정 */}
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
        오늘 · 5월 19일 (화)
      </p>

      <div className="space-y-2">
        {[
          { time: '10:00', member: '이수진', coach: '김민준', status: '완료', statusClass: 'bg-emerald-500/10 text-emerald-400' },
          { time: '11:00', member: '박준영', coach: '김민준', status: '진행 중', statusClass: 'bg-volta-muted text-volta', accent: true },
          { time: '14:00', member: '최민서', coach: '박서연', status: '예정', statusClass: 'bg-secondary text-muted-foreground' },
          { time: '15:00', member: '강유진', coach: '최태호', status: '예정', statusClass: 'bg-secondary text-muted-foreground' },
        ].map((item) => (
          <div
            key={item.time + item.member}
            className={`flex items-center gap-3 bg-card border rounded-xl p-4 transition-colors ${item.accent ? 'border-volta/20' : 'border-border'}`}
          >
            <span className="text-[11px] text-muted-foreground w-10 shrink-0 tabular-nums">{item.time}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{item.member}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.coach}</p>
            </div>
            <span className={`text-[10px] font-medium px-2 py-1 rounded-full shrink-0 ${item.statusClass}`}>
              {item.status}
            </span>
          </div>
        ))}
      </div>

      {/* 개발용 역할 전환 */}
      <div className="mt-10 pt-5 border-t border-border">
        <p className="text-[11px] text-muted-foreground mb-2">개발 테스트 — 역할 전환</p>
        <div className="flex gap-2">
          <a href="/api/dev/login?role=OWNER" className="text-xs px-3 py-1.5 rounded-lg border border-volta/30 bg-volta-muted text-volta">대표</a>
          <a href="/api/dev/login?role=COACH" className="text-xs px-3 py-1.5 rounded-lg border border-border bg-secondary text-muted-foreground hover:text-foreground transition-colors">코치</a>
          <a href="/api/dev/login?role=MEMBER" className="text-xs px-3 py-1.5 rounded-lg border border-border bg-secondary text-muted-foreground hover:text-foreground transition-colors">회원</a>
        </div>
      </div>
    </main>
  )
}
