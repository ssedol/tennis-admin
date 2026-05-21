'use client'

import { useActionState } from 'react'
import { changePasswordAction } from './actions'

export default function ChangePasswordPage() {
  const [error, action, pending] = useActionState(changePasswordAction, null)

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-background">
      {/* 딤 오버레이 느낌 */}
      <div className="absolute inset-0 bg-black/40" />

      {/* 모달 카드 — MembersClient 등록 폼과 동일한 스타일 */}
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
        {/* 헤더 */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-volta" />
            <span className="text-sm font-medium text-zinc-400">테니스 관리</span>
          </div>
          <h1 className="text-base font-semibold text-white">비밀번호 설정</h1>
          <p className="text-xs text-zinc-400 mt-1">
            첫 로그인입니다. 사용할 비밀번호를 설정해주세요.
          </p>
        </div>

        <form action={action} className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">
              새 비밀번호 <span className="text-zinc-600">(6자 이상)</span>
            </label>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="새 비밀번호 입력"
              autoFocus
              className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-white placeholder:text-zinc-500 outline-none focus:border-volta transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">
              비밀번호 확인
            </label>
            <input
              name="confirm"
              type="password"
              required
              placeholder="비밀번호 다시 입력"
              className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-white placeholder:text-zinc-500 outline-none focus:border-volta transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full py-3 rounded-xl bg-volta text-black text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {pending ? '설정 중...' : '비밀번호 설정 완료'}
          </button>
        </form>
      </div>
    </main>
  )
}
