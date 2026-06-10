export function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#222222] border-t-[#c8f000] animate-spin" />
        <p className="text-sm text-[#888888]">불러오는 중...</p>
      </div>
    </div>
  )
}
