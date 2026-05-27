import { OwnerNav } from '@/components/owner/OwnerNav'
import { LogoutButton } from '@/components/layout/LogoutButton'

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="max-w-screen-sm mx-auto px-5 flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-volta" />
            <span className="font-semibold text-[15px]">테니스 관리</span>
          </div>
          <LogoutButton />
        </div>
        <OwnerNav />
      </header>

      <main className="max-w-screen-sm mx-auto px-5 pt-5 pb-20">
        {children}
      </main>
    </div>
  )
}
