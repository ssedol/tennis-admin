'use client'

import { useState, useRef } from 'react'

type TimestampComment = {
  id: string
  author: string
  role: 'COACH' | 'MEMBER'
  timestamp: number  // 초 단위
  content: string
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0')
  const s = (sec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const MOCK_COMMENTS: TimestampComment[] = [
  { id: '1', author: '코치 김민준', role: 'COACH',  timestamp: 12,  content: '임팩트 직전 팔꿈치가 벌어집니다. 몸에 가깝게 유지하세요.' },
  { id: '2', author: '코치 김민준', role: 'COACH',  timestamp: 34,  content: '스텝이 좋아요! 체중 이동이 자연스럽습니다.' },
  { id: '3', author: '이수진',      role: 'MEMBER', timestamp: 34,  content: '의식하니까 되는데 무의식으로 나올 때까지 얼마나 걸릴까요?' },
  { id: '4', author: '코치 김민준', role: 'COACH',  timestamp: 58,  content: '팔로우스루가 짧게 끊깁니다. 공 지나간 후에도 스윙을 끝까지 이어가세요.' },
]

export function VideoFeedback({ lessonId }: { lessonId: string }) {
  const [hasVideo] = useState(true)   // 목업: 영상 있음
  const [currentTime, setCurrentTime] = useState(0)
  const [draft, setDraft] = useState('')
  const [activeTimestamp, setActiveTimestamp] = useState<number | null>(null)
  const videoDuration = 75  // 목업: 75초짜리 영상
  const progressRef = useRef<HTMLDivElement>(null)

  void lessonId

  // 타임라인 클릭 핸들러
  function handleTimelineClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!progressRef.current) return
    const rect = progressRef.current.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    setCurrentTime(Math.floor(ratio * videoDuration))
  }

  // 타임스탬프로 이동
  function seekTo(sec: number) {
    setCurrentTime(sec)
    setActiveTimestamp(sec)
  }

  // 댓글을 타임스탬프 순으로 그룹화
  const grouped = MOCK_COMMENTS.reduce<Record<number, TimestampComment[]>>((acc, c) => {
    if (!acc[c.timestamp]) acc[c.timestamp] = []
    acc[c.timestamp].push(c)
    return acc
  }, {})

  if (!hasVideo) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-card border-2 border-dashed border-border flex items-center justify-center">
          <svg className="w-7 h-7 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium mb-1">영상이 없습니다</p>
          <p className="text-xs text-muted-foreground mb-4">레슨 영상을 업로드하면 코치가 시간대별 피드백을 남길 수 있습니다</p>
          <button className="px-5 py-2.5 rounded-lg bg-volta text-black text-sm font-semibold hover:opacity-90 transition-opacity">
            영상 업로드
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 비디오 플레이어 (목업) */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="relative aspect-video bg-black/60 flex items-center justify-center">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <p className="text-xs text-white/50">레슨 영상</p>
          </div>

          {/* 타임스탬프 마커 */}
          {MOCK_COMMENTS.filter((c, i, arr) => arr.findIndex(x => x.timestamp === c.timestamp) === i)
            .map((c) => (
              <button
                key={c.timestamp}
                onClick={() => seekTo(c.timestamp)}
                style={{ left: `${(c.timestamp / videoDuration) * 100}%` }}
                className="absolute bottom-8 -translate-x-1/2 w-2 h-2 rounded-full bg-volta hover:scale-150 transition-transform"
                title={formatTime(c.timestamp)}
              />
            ))
          }
        </div>

        {/* 타임라인 */}
        <div className="px-4 py-3">
          <div
            ref={progressRef}
            onClick={handleTimelineClick}
            className="relative h-1.5 bg-secondary rounded-full cursor-pointer group"
          >
            <div
              className="absolute left-0 top-0 h-full bg-volta rounded-full transition-all"
              style={{ width: `${(currentTime / videoDuration) * 100}%` }}
            />
            {/* 댓글 마커 */}
            {MOCK_COMMENTS.filter((c, i, arr) => arr.findIndex(x => x.timestamp === c.timestamp) === i)
              .map((c) => (
                <div
                  key={c.timestamp}
                  style={{ left: `${(c.timestamp / videoDuration) * 100}%` }}
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full transition-colors ${
                    activeTimestamp === c.timestamp ? 'bg-volta scale-125' : 'bg-volta/60'
                  }`}
                />
              ))
            }
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[11px] text-muted-foreground tabular-nums">{formatTime(currentTime)}</span>
            <span className="text-[11px] text-muted-foreground tabular-nums">{formatTime(videoDuration)}</span>
          </div>
        </div>

        {/* 현재 타임스탬프 피드백 추가 */}
        <div className="px-4 pb-3 border-t border-border pt-3 flex gap-2 items-start">
          <span className="shrink-0 mt-2.5 text-xs font-mono text-volta">{formatTime(currentTime)}</span>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`${formatTime(currentTime)} 에 코멘트 추가...`}
            rows={2}
            className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-volta transition-colors resize-none"
          />
          <button
            disabled={!draft.trim()}
            className="self-end px-3 py-2 rounded-lg bg-volta text-black text-xs font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            추가
          </button>
        </div>
      </div>

      {/* 타임스탬프별 코멘트 목록 */}
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          타임스탬프 코멘트
        </p>
        {Object.entries(grouped)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([ts, comments]) => (
            <div
              key={ts}
              onClick={() => seekTo(Number(ts))}
              className={`bg-card border rounded-xl p-4 cursor-pointer transition-colors ${
                activeTimestamp === Number(ts)
                  ? 'border-volta/30 bg-volta/5'
                  : 'border-border hover:border-border/80'
              }`}
            >
              {/* 타임스탬프 배지 */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-mono font-semibold text-volta bg-volta/10 px-2 py-0.5 rounded-md">
                  {formatTime(Number(ts))}
                </span>
                <span className="text-xs text-muted-foreground">{comments.length}개 코멘트</span>
              </div>

              {/* 코멘트들 */}
              <div className="space-y-2.5">
                {comments.map((c) => {
                  const isCoach = c.role === 'COACH'
                  return (
                    <div key={c.id} className="flex gap-2.5">
                      <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold ${
                        isCoach ? 'bg-volta/10 text-volta' : 'bg-secondary text-muted-foreground'
                      }`}>
                        {c.author[isCoach ? 3 : 0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold">{c.author} </span>
                        <span className="text-xs text-muted-foreground leading-relaxed">{c.content}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
