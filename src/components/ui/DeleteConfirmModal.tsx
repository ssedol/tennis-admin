'use client'

type Props = {
  open: boolean
  title?: string
  description: string
  confirming?: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function DeleteConfirmModal({
  open,
  title = '레슨을 삭제할까요?',
  description,
  confirming = false,
  onCancel,
  onConfirm,
}: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={confirming ? undefined : onCancel}
      />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-sm">
        <p className="text-sm font-semibold text-foreground mb-1">{title}</p>
        <p className="text-xs text-muted-foreground mb-5 leading-relaxed whitespace-pre-line">
          {description}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={confirming}
            className="flex-1 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-sm font-medium transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming}
            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {confirming ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </div>
    </div>
  )
}
