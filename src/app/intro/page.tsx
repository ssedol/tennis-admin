import Link from 'next/link'

const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
    title: '레슨 일정',
    desc: '단건·반복 등록, 오늘·주간·월간 보기',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
      </svg>
    ),
    title: '영상 피드백',
    desc: '코치·회원 각 영상 업로드, 타임스탬프 코멘트',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    title: '피드백 댓글',
    desc: '레슨별 코치·회원 실시간 소통',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    title: '개인 일지',
    desc: '레슨·자율연습·경기 기록 관리',
  },
]

const coachFeatures = [
  '레슨 단건·반복 등록 및 일정 관리',
  '레슨 시작·종료로 상태 실시간 변경',
  '영상 업로드 및 타임스탬프 코멘트',
  '회원 초대 및 목록 관리',
]

const memberFeatures = [
  '다음 레슨 D-Day 및 일정 확인',
  '영상 업로드 및 코치 영상 열람',
  '타임스탬프 코멘트 작성·열람',
  '레슨·연습·경기 개인 일지 기록',
]

export default function IntroPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-screen-sm mx-auto px-5 py-10 flex flex-col gap-12">

        {/* ── 헤더 ── */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-volta" />
            <span className="font-semibold text-[15px] tracking-tight">테니스 관리</span>
          </div>
          <Link
            href="/login"
            className="text-xs font-semibold px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-volta/40 transition-colors"
          >
            로그인
          </Link>
        </header>

        {/* ── 히어로 ── */}
        <section className="pt-4">
          {/* 배지 */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-volta/10 border border-volta/20 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-volta animate-pulse" />
            <span className="text-[11px] font-semibold text-volta tracking-wide uppercase">Tennis Admin</span>
          </div>

          <h1 className="text-4xl font-black tracking-tighter leading-[1.1] mb-4">
            코치와 회원을 위한<br />
            <span className="text-volta">스마트 레슨</span> 플랫폼
          </h1>

          <p className="text-base text-muted-foreground leading-relaxed mb-8">
            레슨 일정부터 영상 피드백까지.<br />
            코치는 더 체계적으로, 회원은 더 빠르게 성장합니다.
          </p>

          {/* 태그 */}
          <div className="flex flex-wrap gap-2">
            {['레슨 일정', '영상 피드백', '타임스탬프 코멘트', '개인 일지', '회원 관리'].map((tag) => (
              <span
                key={tag}
                className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-secondary text-muted-foreground border border-border"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>

        {/* ── 기능 그리드 ── */}
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            주요 기능
          </p>
          <div className="grid grid-cols-2 gap-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3"
              >
                <div className="w-9 h-9 rounded-lg bg-volta/10 border border-volta/20 flex items-center justify-center text-volta">
                  {f.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold mb-0.5">{f.title}</p>
                  <p className="text-[11px] text-muted-foreground leading-snug">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 권한별 기능 ── */}
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            역할별 기능
          </p>
          <div className="flex flex-col gap-3">

            {/* 코치 */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-volta/5">
                <div className="w-6 h-6 rounded-md bg-volta flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold">코치</p>
              </div>
              <ul className="px-4 py-3 space-y-2">
                {coachFeatures.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-volta shrink-0" />
                    <span className="text-sm text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 회원 */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
                <div className="w-6 h-6 rounded-md bg-secondary border border-border flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold">회원</p>
              </div>
              <ul className="px-4 py-3 space-y-2">
                {memberFeatures.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-border shrink-0" />
                    <span className="text-sm text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── 플로우 다이어그램 ── */}
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            레슨 흐름
          </p>
          <div className="flex items-center gap-0">
            {[
              { label: '레슨 등록', sub: '코치' },
              { label: '레슨 진행', sub: '시작→종료' },
              { label: '영상 업로드', sub: '코치·회원' },
              { label: '피드백', sub: '댓글·코멘트' },
            ].map((step, i) => (
              <div key={step.label} className="flex items-center flex-1">
                <div className="flex-1 flex flex-col items-center text-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1.5 ${
                    i === 0 ? 'bg-volta text-black' : 'bg-secondary border border-border text-muted-foreground'
                  }`}>
                    {i + 1}
                  </div>
                  <p className="text-[11px] font-semibold leading-tight">{step.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{step.sub}</p>
                </div>
                {i < 3 && (
                  <div className="w-4 h-px bg-border shrink-0 mb-5" />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="pb-4">
          <div className="bg-card border border-border rounded-2xl p-6 text-center">
            <div className="w-10 h-10 rounded-xl bg-volta/10 border border-volta/20 flex items-center justify-center mx-auto mb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-volta" />
            </div>
            <p className="text-base font-bold mb-1.5">지금 바로 시작하세요</p>
            <p className="text-sm text-muted-foreground mb-5">코치 계정으로 로그인하고 첫 레슨을 등록해보세요</p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-volta text-black font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              시작하기
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>
          </div>
        </section>

        {/* ── 푸터 ── */}
        <footer className="text-center pb-2">
          <p className="text-[11px] text-muted-foreground/50">
            테니스 관리 · 코치와 회원을 위한 레슨 플랫폼
          </p>
        </footer>

      </div>
    </div>
  )
}
