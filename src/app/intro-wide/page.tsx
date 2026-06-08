import Link from 'next/link'

const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
    title: '레슨 일정',
    desc: '단건·반복 등록\n오늘·주간·월간 보기',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
      </svg>
    ),
    title: '영상 피드백',
    desc: '코치·회원 각 1개 업로드\n타임스탬프 코멘트',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    title: '피드백 댓글',
    desc: '코치·회원 실시간 소통\n레슨별 스레드',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    title: '개인 일지',
    desc: '레슨·자율연습·경기\n기록 관리',
  },
]

const coachFeatures = [
  { text: '레슨 단건·반복 일정 등록' },
  { text: '시작·종료 버튼으로 상태 관리' },
  { text: '레슨 영상 업로드 및 교체' },
  { text: '타임스탬프 코멘트 작성' },
  { text: '회원 초대 및 목록 관리' },
]

const memberFeatures = [
  { text: '다음 레슨 D-Day 및 일정 확인' },
  { text: '지난 레슨 피드백 열람' },
  { text: '본인 영상 업로드 및 시청' },
  { text: '코치 영상 타임스탬프 코멘트' },
  { text: '레슨·연습·경기 일지 기록' },
]

const steps = [
  { num: '01', label: '레슨 등록', sub: '코치가 일정 생성', volta: true },
  { num: '02', label: '레슨 진행', sub: '시작 → 종료', volta: false },
  { num: '03', label: '영상 업로드', sub: '코치 · 회원 각 1개', volta: false },
  { num: '04', label: '피드백', sub: '댓글 · 코멘트', volta: false },
]

const SEP = 'border-white/[0.1]'

export default function IntroWidePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col select-none">

      {/* ── 헤더 ── */}
      <header className={`flex items-center justify-between px-12 py-4 border-b ${SEP} shrink-0`}>
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-volta" />
          <span className="font-bold text-lg tracking-tight">테니스 관리</span>
        </div>
        <div className="flex items-center gap-8">
          <span className="text-sm text-muted-foreground">코치 · 회원 레슨 플랫폼</span>
          <Link
            href="/login"
            className="text-sm font-bold px-5 py-2.5 rounded-xl bg-volta text-black hover:opacity-90 transition-opacity"
          >
            시작하기 →
          </Link>
        </div>
      </header>

      {/* ── 히어로 ── */}
      <section className={`flex flex-col items-center justify-center text-center px-12 py-14 border-b ${SEP} shrink-0`}>
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-volta/10 border border-volta/25 mb-7">
          <span className="w-2 h-2 rounded-full bg-volta animate-pulse" />
          <span className="text-xs font-bold text-volta tracking-widest uppercase">Tennis Admin</span>
        </div>

        <h1 className="text-6xl font-black tracking-tighter leading-[1.05] mb-5">
          코치와 회원을 위한<br />
          <span className="text-volta">스마트 레슨</span> 플랫폼
        </h1>

        <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-xl">
          레슨 일정부터 영상 피드백까지 — 코치는 더 체계적으로, 회원은 더 빠르게 성장합니다.
        </p>

        <div className="flex flex-wrap justify-center gap-2.5">
          {['레슨 일정', '영상 피드백', '타임스탬프 코멘트', '개인 일지', '회원 관리'].map((tag) => (
            <span
              key={tag}
              className="text-sm font-medium px-3.5 py-1.5 rounded-full bg-white/5 text-muted-foreground border border-white/10"
            >
              {tag}
            </span>
          ))}
        </div>
      </section>

      {/* ── 기능 4분할 ── */}
      <div className={`grid grid-cols-4 border-b ${SEP} flex-1`}>
        {features.map((f, i) => (
          <div
            key={f.title}
            className={`flex flex-col gap-5 px-10 py-8 ${i < 3 ? `border-r ${SEP}` : ''}`}
          >
            <div className="w-12 h-12 rounded-2xl bg-volta/10 border border-volta/20 flex items-center justify-center text-volta shrink-0">
              {f.icon}
            </div>
            <div>
              <p className="text-lg font-bold mb-2">{f.title}</p>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── 역할 비교 ── */}
      <div className={`grid grid-cols-2 border-b ${SEP} flex-1`}>

        {/* 코치 */}
        <div className={`px-12 py-8 border-r ${SEP}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-volta flex items-center justify-center shrink-0">
              <svg className="w-4.5 h-4.5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-bold leading-none">코치</p>
              <p className="text-sm text-muted-foreground mt-0.5">일정 관리 및 피드백 제공</p>
            </div>
          </div>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-3">
            {coachFeatures.map((item) => (
              <li key={item.text} className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-volta shrink-0" />
                <span className="text-sm text-muted-foreground">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 회원 */}
        <div className="px-12 py-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-white/8 border border-white/15 flex items-center justify-center shrink-0">
              <svg className="w-4.5 h-4.5 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-bold leading-none">회원</p>
              <p className="text-sm text-muted-foreground mt-0.5">일정 확인 및 성장 기록</p>
            </div>
          </div>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-3">
            {memberFeatures.map((item) => (
              <li key={item.text} className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-white/30 shrink-0" />
                <span className="text-sm text-muted-foreground">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── 레슨 흐름 푸터 ── */}
      <footer className="flex items-center gap-10 px-12 py-5 shrink-0">
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground shrink-0">
          레슨 흐름
        </span>

        <div className="flex items-center gap-0 flex-1">
          {steps.map((step, i) => (
            <div key={step.num} className="flex items-center flex-1">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                  step.volta
                    ? 'bg-volta text-black'
                    : 'bg-white/8 border border-white/15 text-muted-foreground'
                }`}>
                  {step.num}
                </div>
                <div>
                  <p className="text-sm font-semibold leading-none">{step.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{step.sub}</p>
                </div>
              </div>
              {i < steps.length - 1 && (
                <div className="flex-1 flex justify-center">
                  <svg className="w-4 h-4 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        <Link
          href="/login"
          className="flex items-center gap-2 text-sm font-bold px-6 py-2.5 rounded-xl bg-volta text-black hover:opacity-90 transition-opacity shrink-0"
        >
          지금 시작하기
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M9 18l6-6-6-6" />
          </svg>
        </Link>
      </footer>

    </div>
  )
}
