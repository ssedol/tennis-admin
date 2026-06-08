'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'

type TimestampComment = {
  id: string
  author: string
  role: 'COACH' | 'MEMBER'
  timestamp: number
  content: string
}

type VideoData = {
  id: string
  url: string | null
  duration_sec: number | null
  isUploader: boolean
  comments: TimestampComment[]
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

function VideoPanel({
  label,
  video,
  lessonId,
  canUpload,
  readOnly,
  onRefresh,
}: {
  label: string
  video: VideoData | null
  lessonId: string
  canUpload: boolean
  readOnly: boolean
  onRefresh: () => void
}) {
  const [currentTime, setCurrentTime] = useState(0)
  const [draft, setDraft] = useState('')
  const [activeTimestamp, setActiveTimestamp] = useState<number | null>(null)
  const [videoDuration, setVideoDuration] = useState(video?.duration_sec ?? 0)
  const [uploading, setUploading] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(file: File) {
    setUploading(true)
    setError(null)
    const durationSec = await readVideoDuration(file)

    let prepareRes: Response
    let prepare: { error?: string; signedUrl?: string; storagePath?: string } = {}
    try {
      prepareRes = await fetch(`/api/lessons/${lessonId}/video/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      })
      prepare = await prepareRes.json()
    } catch (e) {
      setUploading(false)
      setError(`업로드 준비 실패: ${e instanceof Error ? e.message : String(e)}`)
      return
    }

    if (!prepareRes!.ok || !prepare.signedUrl || !prepare.storagePath) {
      setUploading(false)
      setError(prepare.error ?? '서명 URL을 받지 못했습니다')
      return
    }

    const uploadFd = new FormData()
    uploadFd.append('cacheControl', '3600')
    uploadFd.append('', file)

    let uploadRes: Response
    try {
      uploadRes = await fetch(prepare.signedUrl, { method: 'PUT', body: uploadFd })
    } catch (e) {
      setUploading(false)
      setError(`스토리지 업로드 실패: ${e instanceof Error ? e.message : String(e)}`)
      return
    }

    if (!uploadRes!.ok) {
      setUploading(false)
      setError(`스토리지 업로드 실패 (${uploadRes!.status})`)
      return
    }

    let confirmRes: Response
    let confirm: { error?: string } = {}
    try {
      confirmRes = await fetch(`/api/lessons/${lessonId}/video/upload/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePath: prepare.storagePath, durationSec: durationSec > 0 ? durationSec : null }),
      })
      confirm = await confirmRes.json()
    } catch (e) {
      setUploading(false)
      setError(`업로드 완료 처리 실패: ${e instanceof Error ? e.message : String(e)}`)
      return
    }

    setUploading(false)
    if (!confirmRes!.ok) {
      setError(confirm.error ?? '업로드 완료 처리 중 오류가 발생했습니다')
      return
    }

    onRefresh()
  }

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/lessons/${lessonId}/video`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? '영상 삭제 중 오류가 발생했습니다')
        return
      }
      onRefresh()
    } catch (e) {
      setError(`영상 삭제 실패: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setDeleting(false)
      setDeleteConfirm(false)
    }
  }

  async function handleAddComment() {
    if (!draft.trim() || submitting || !video) return
    setSubmitting(true)
    setError(null)

    const res = await fetch(`/api/lessons/${lessonId}/video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: draft.trim(), timestamp_sec: currentTime, videoId: video.id }),
    })
    const json = await res.json()
    setSubmitting(false)

    if (!res.ok) {
      setError(json.error ?? '등록 중 오류가 발생했습니다')
      return
    }

    setDraft('')
    onRefresh()
  }

  function seekTo(sec: number) {
    setCurrentTime(sec)
    setActiveTimestamp(sec)
    if (videoRef.current) videoRef.current.currentTime = sec
  }

  const comments = video?.comments ?? []
  const uniqueTimestamps = [...new Set(comments.map((c) => c.timestamp))]
  const grouped = comments.reduce<Record<number, TimestampComment[]>>((acc, c) => {
    if (!acc[c.timestamp]) acc[c.timestamp] = []
    acc[c.timestamp].push(c)
    return acc
  }, {})

  const duration =
    videoRef.current?.duration && Number.isFinite(videoRef.current.duration)
      ? Math.floor(videoRef.current.duration)
      : (videoDuration ?? 0) > 0
        ? (videoDuration as number)
        : Math.max(...comments.map((c) => c.timestamp), 1)

  return (
    <div className="space-y-3">
      {label && (
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      )}

      {!video ? (
        <div className="flex flex-col items-center justify-center py-10 gap-4 bg-card border border-dashed border-border rounded-xl">
          <div className="w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium mb-1">영상 없음</p>
            {canUpload && (
              <>
                <input
                  ref={uploadInputRef}
                  type="file"
                  accept={ACCEPT}
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) setPendingFile(file)
                    e.target.value = ''
                  }}
                />
                <button
                  type="button"
                  onClick={() => uploadInputRef.current?.click()}
                  disabled={uploading}
                  className="px-5 py-2.5 rounded-lg bg-volta text-black text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
                >
                  {uploading ? '업로드 중...' : '영상 업로드'}
                </button>
                <p className="text-[11px] text-muted-foreground mt-2">MP4 · MOV · WEBM · 최대 100MB</p>
              </>
            )}
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="relative aspect-video bg-black">
              {video.url ? (
                <video
                  ref={videoRef}
                  src={video.url}
                  className="w-full h-full object-contain"
                  controls
                  playsInline
                  onTimeUpdate={() => {
                    if (videoRef.current) setCurrentTime(Math.floor(videoRef.current.currentTime))
                  }}
                  onLoadedMetadata={() => {
                    if (videoRef.current?.duration) {
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

            <div className="px-4 pb-3 border-t border-border pt-3 flex gap-2 items-start">
              <span className="shrink-0 mt-2.5 text-xs font-mono text-volta">{formatTime(currentTime)}</span>
              {!readOnly ? (
                <>
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
                </>
              ) : (
                <p className="text-xs text-muted-foreground py-2">열람 전용 · 코치·회원만 댓글을 작성할 수 있습니다</p>
              )}
            </div>
          </div>

          {video.isUploader && !readOnly && (
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setDeleteConfirm(true)}
                disabled={uploading || deleting}
                className="px-4 py-2 rounded-lg border border-red-400/50 text-red-400 text-sm font-medium hover:bg-red-400/10 transition-colors disabled:opacity-40"
              >
                영상 삭제
              </button>
              <input
                ref={replaceInputRef}
                type="file"
                accept={ACCEPT}
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) setPendingFile(file)
                  e.target.value = ''
                }}
              />
              <button
                type="button"
                onClick={() => replaceInputRef.current?.click()}
                disabled={uploading || deleting}
                className="px-4 py-2 rounded-lg bg-volta text-black text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {uploading ? '업로드 중...' : '영상 교체'}
              </button>
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
      )}

      <DeleteConfirmModal
        open={pendingFile !== null && !uploading}
        title="영상을 업로드할까요?"
        description={pendingFile ? `${pendingFile.name}\n${(pendingFile.size / 1024 / 1024).toFixed(1)}MB` : ''}
        confirmLabel="업로드"
        confirmingLabel="업로드 중..."
        confirmVariant="primary"
        confirming={uploading}
        onCancel={() => setPendingFile(null)}
        onConfirm={() => {
          if (pendingFile) {
            const file = pendingFile
            setPendingFile(null)
            handleUpload(file)
          }
        }}
      />

      <DeleteConfirmModal
        open={deleteConfirm}
        title="영상을 삭제할까요?"
        description="삭제한 영상과 타임스탬프 코멘트는 복구할 수 없습니다."
        confirmLabel="삭제"
        confirming={deleting}
        onCancel={() => setDeleteConfirm(false)}
        onConfirm={handleDelete}
      />
    </div>
  )
}

type TabKey = 'member' | 'coach'

export function VideoFeedback({ lessonId, readOnly = false }: { lessonId: string; readOnly?: boolean }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [coachVideo, setCoachVideo] = useState<VideoData | null>(null)
  const [memberVideo, setMemberVideo] = useState<VideoData | null>(null)
  const [canUpload, setCanUpload] = useState(false)
  const [myRole, setMyRole] = useState<'COACH' | 'MEMBER' | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('member')

  const loadVideos = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/lessons/${lessonId}/video`)
    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(json.error ?? '영상 정보를 불러오지 못했습니다')
      return
    }

    setCoachVideo(json.coachVideo ?? null)
    setMemberVideo(json.memberVideo ?? null)
    setCanUpload(json.canUpload ?? false)
    setMyRole(json.myRole ?? null)
  }, [lessonId])

  useEffect(() => {
    loadVideos()
  }, [loadVideos])

  if (loading) {
    return <p className="text-sm text-muted-foreground text-center py-16">불러오는 중...</p>
  }

  if (error) {
    return <p className="text-sm text-destructive text-center py-16">{error}</p>
  }

  const tabs: { key: TabKey; label: string; hasVideo: boolean }[] = [
    { key: 'member', label: '회원 영상', hasVideo: memberVideo !== null },
    { key: 'coach',  label: '코치 영상', hasVideo: coachVideo !== null },
  ]

  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 bg-secondary rounded-xl">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            {tab.hasVideo && (
              <span className="w-1.5 h-1.5 rounded-full bg-volta shrink-0" />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'member' && (
        <VideoPanel
          label=""
          video={memberVideo}
          lessonId={lessonId}
          canUpload={!readOnly && myRole === 'MEMBER' && canUpload}
          readOnly={readOnly}
          onRefresh={loadVideos}
        />
      )}
      {activeTab === 'coach' && (
        <VideoPanel
          label=""
          video={coachVideo}
          lessonId={lessonId}
          canUpload={!readOnly && myRole === 'COACH' && canUpload}
          readOnly={readOnly}
          onRefresh={loadVideos}
        />
      )}
    </div>
  )
}
