'use client'

import { useState } from 'react'

type Comment = {
  id: string
  author: string
  role: 'COACH' | 'MEMBER'
  content: string
  createdAt: string
}

const MOCK_COMMENTS: Comment[] = [
  { id: '1', author: '코치 김민준', role: 'COACH',  content: '오늘 백핸드 스윙 궤적이 많이 좋아졌어요. 특히 팔꿈치 각도 교정이 잘 됐습니다.', createdAt: '오전 11:20' },
  { id: '2', author: '이수진',      role: 'MEMBER', content: '감사합니다! 집에서 거울 보면서 계속 연습했는데 도움이 됐나봐요. 서브는 어떤가요?', createdAt: '오후 2:15' },
  { id: '3', author: '코치 김민준', role: 'COACH',  content: '서브 토스가 아직 왼쪽으로 편향됩니다. 토스 연습을 따로 해보세요. 공을 던지지 말고 위로 올리는 느낌으로요.', createdAt: '오후 3:40' },
]

export function FeedbackThread({ lessonId }: { lessonId: string }) {
  const [comments] = useState<Comment[]>(MOCK_COMMENTS)
  const [draft, setDraft] = useState('')

  void lessonId

  return (
    <div className="flex flex-col gap-4">
      {/* 댓글 목록 */}
      <div className="space-y-3">
        {comments.map((c) => {
          const isCoach = c.role === 'COACH'
          return (
            <div key={c.id} className={`flex gap-3 ${isCoach ? '' : 'flex-row-reverse'}`}>
              {/* 아바타 */}
              <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
                isCoach ? 'bg-volta/10 text-volta' : 'bg-secondary text-muted-foreground'
              }`}>
                {c.author[isCoach ? 3 : 0]}
              </div>

              {/* 말풍선 */}
              <div className={`max-w-[80%] ${isCoach ? '' : 'items-end flex flex-col'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold">{c.author}</span>
                  <span className="text-[11px] text-muted-foreground">{c.createdAt}</span>
                </div>
                <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  isCoach
                    ? 'bg-card border border-border text-foreground rounded-tl-sm'
                    : 'bg-volta/10 text-foreground rounded-tr-sm'
                }`}>
                  {c.content}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 입력창 */}
      <div className="flex gap-2 pt-2 border-t border-border">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="코치에게 질문하거나 메모를 남겨보세요..."
          rows={2}
          className="flex-1 px-3.5 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-volta transition-colors resize-none"
        />
        <button
          disabled={!draft.trim()}
          className="self-end px-4 py-2.5 rounded-xl bg-volta text-black text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          전송
        </button>
      </div>
    </div>
  )
}
