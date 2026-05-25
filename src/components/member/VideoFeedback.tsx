'use client'

import { useCallback, useEffect, useState, useRef } from 'react'

type TimestampComment = {
  id: string
  author: string
  role: 'COACH' | 'MEMBER'
  timestamp: number
  content: string
}

const ACCEPT = 'video/mp4,video/quicktime,video/webm'

function formatTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0')
  const s = Math.floor(sec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src)
      resolve(Math.floor(video.duration) || 0)
    }
    video.onerror = () => {
      URL.revokeObjectURL(video.src)
      resolve(0)
    }
    video.src = URL.createObjectURL(file)
  })
}

function UploadPanel({
  uploading,
  label = '영상 업로드',
  onSelect,
}: {
  uploading: boolean
  label?: string
  onSelect: (file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        disabled={uploading}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onSelect(file)
          e.target.value = ''
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="px-5 py-2.5 rounded-lg bg-volta text-black text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
      >
        {uploading ? '업로드 중...' : label}
      </button>
      <p className="text-[11px] text-muted-foreground mt-2">MP4 · MOV · WEBM · 최대 100MB</p>
    </>
  )
}

export function VideoFeedback({ lessonId }: { lessonId: string }) {
  const [hasVideo, setHasVideo] = useState<boolean | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [canUpload, setCanUpload] = useState(false)
  const [comments, setComments] = useState<TimestampComment[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [draft, setDraft] = useState('')
  const [activeTimestamp, setActiveTimestamp] = useState<number | null>(null)
  const [videoDuration, setVideoDuration] = useState(0)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const loadVideo = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/lessons/${lessonId}/video`)
    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(json.error ?? '영상 정보를 불러오지 못했습니다')
      setHasVideo(false)
      return
    }

    setCanUpload(json.canUpload ?? false)

    if (!json.video) {
      setHasVideo(false)
      setVideoUrl(null)
      setComments([])
      return
    }

    setHasVideo(true)
    setVideoUrl(json.video.url ?? null)
    setVideoDuration(json.video.duration_sec ?? 0)
    setComments(json.comments ?? [])
  }, [lessonId])

  useEffect(() => {
    loadVideo()
  }, [loadVideo])

  async function handleUpload(file: File) {
    setUploading(true)
    setError(null)

    const durationSec = await readVideoDuration(file)
    const formData = new FormData()
    formData.append('file', file)
    if (durationSec > 0) formData.append('duration_sec', String(durationSec))

    const res = await fetch(`/api/lessons/${lessonId}/video/upload`, {
      method: 'POST',
      body: formData,
    })

    const json = await res.json()
    setUploading(false)

    if (!res.ok) {
      setError(json.error ?? '업로드 중 오류가 발생했습니다')
      return
    }

    setHasVideo(true)
    setVideoUrl(json.video.url ?? null)
    setVideoDuration(json.video.duration_sec ?? durationSec)
    setComments([])
    setCurrentTime(0)
  }

  function handleTimelineClick(e: React.MouseEvent<HTMLDivElement>) {
    const duration = videoRef.current?.duration || videoDuration
    if (!progressRef.current || duration <= 0) return
    const rect = progressRef.current.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const sec = Math.floor(ratio * duration)
    setCurrentTime(sec)
    if (videoRef.current) videoRef.current.currentTime = sec
  }

  function seekTo(sec: number) {
    setCurrentTime(sec)
    setActiveTimestamp(sec)
    if (videoRef.current) videoRef.current.currentTime = sec
  }

  async function handleAddComment() {
    if (!draft.trim() || submitting) return

    setSubmitting(true)
    setError(null)

    const res = await fetch(`/api/lessons/${lessonId}/video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: draft.trim(), timestamp_sec: currentTime }),
    })

    const json = await res.json()
    setSubmitting(false)

    if (!res.ok) {
      setError(json.error ?? '등록 중 오류가 발생했습니다')
      return
    }

    setComments((prev) => [...prev, json.comment].sort((a, b) => a.timestamp - b.timestamp))
    setDraft('')
  }

  const uniqueTimestamps = [...new Set(comments.map((c) => c.timestamp))]

  const grouped = comments.reduce<Record<number, TimestampComment[]>>((acc, c) => {
    if (!acc[c.timestamp]) acc[c.timestamp] = []
    acc[c.timestamp].push(c)
    return acc
  }, {})

  if (loading) {
    return <p className="text-sm text-muted-foreground text-center py-16">불러오는 중...</p>
  }

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
          <p className="text-xs text-muted-foreground mb-4">
            {canUpload
              ? '레슨 영상을 업로드하면 코치가 시간대별 피드백을 남길 수 있습니다'
              : '회원이 영상을 업로드하면 시간대별 피드백을 남길 수 있습니다'}
          </p>
          {canUpload && <UploadPanel uploading={uploading} onSelect={handleUpload} />}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    )
  }

  const duration =
    videoRef.current?.duration && Number.isFinite(videoRef.current.duration)
      ? Math.floor(videoRef.current.duration)
      : videoDuration > 0
        ? videoDuration
        : Math.max(...comments.map((c) => c.timestamp), 1)

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="relative aspect-video bg-black">
          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-contain"
              controls
              playsInline
              onTimeUpdate={() => {
                if (videoRef.current) setCurrentTime(Math.floor(videoRef.current.currentTime))
              }}
              onLoadedMetadata={() => {
                if (videoRef.current && videoRef.current.duration) {
                  setVideoDuration(Math.floor(videoRef.current.duration))
                }
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-xs text-white/50">영상을 불러올 수 없습니다</p>
            </div>
          )}

          {duration > 0 &&
            uniqueTimestamps.map((ts) => (
              <button
                key={ts}
                type="button"
                onClick={() => seekTo(ts)}
                style={{ left: `${(ts / duration) * 100}%` }}
                className="absolute bottom-12 -translate-x-1/2 w-2 h-2 rounded-full bg-volta hover:scale-150 transition-transform z-10"
                title={formatTime(ts)}
              />
            ))}
        </div>

        <div className="px-4 py-3">
          <div
            ref={progressRef}
            onClick={handleTimelineClick}
            className="relative h-1.5 bg-secondary rounded-full cursor-pointer group"
          >
            <div
              className="absolute left-0 top-0 h-full bg-volta rounded-full transition-all"
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
            {duration > 0 &&
              uniqueTimestamps.map((ts) => (
                <div
                  key={ts}
                  style={{ left: `${(ts / duration) * 100}%` }}
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full transition-colors ${
                    activeTimestamp === ts ? 'bg-volta scale-125' : 'bg-volta/60'
                  }`}
                />
              ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[11px] text-muted-foreground tabular-nums">{formatTime(currentTime)}</span>
            <span className="text-[11px] text-muted-foreground tabular-nums">{formatTime(duration)}</span>
          </div>
        </div>

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
            type="button"
            onClick={handleAddComment}
            disabled={!draft.trim() || submitting}
            className="self-end px-3 py-2 rounded-lg bg-volta text-black text-xs font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            {submitting ? '등록 중...' : '추가'}
          </button>
        </div>
      </div>

      {canUpload && (
        <div className="flex justify-end">
          <UploadPanel uploading={uploading} label="영상 교체" onSelect={handleUpload} />
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          타임스탬프 코멘트
        </p>
        {Object.keys(grouped).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">아직 코멘트가 없습니다</p>
        ) : (
          Object.entries(grouped)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([ts, tsComments]) => (
              <div
                key={ts}
                onClick={() => seekTo(Number(ts))}
                className={`bg-card border rounded-xl p-4 cursor-pointer transition-colors ${
                  activeTimestamp === Number(ts)
                    ? 'border-volta/30 bg-volta/5'
                    : 'border-border hover:border-border/80'
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-mono font-semibold text-volta bg-volta/10 px-2 py-0.5 rounded-md">
                    {formatTime(Number(ts))}
                  </span>
                  <span className="text-xs text-muted-foreground">{tsComments.length}개 코멘트</span>
                </div>

                <div className="space-y-2.5">
                  {tsComments.map((c) => {
                    const isCoach = c.role === 'COACH'
                    return (
                      <div key={c.id} className="flex gap-2.5">
                        <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold ${
                          isCoach ? 'bg-volta/10 text-volta' : 'bg-secondary text-muted-foreground'
                        }`}>
                          {c.author[0]}
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
            ))
        )}
      </div>
    </div>
  )
}
