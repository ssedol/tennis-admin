'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/owner',          label: '대시보드',   exact: true  },
  { href: '/owner/members',  label: '구성원 관리', exact: false },
  { href: '/owner/courts',   label: '코트 관리',  exact: false },
  { href: '/owner/settings', label: '설정',       exact: false },
]

export function OwnerNav() {
  const pathname = usePathname()

  return (
    <nav className="max-w-screen-sm mx-auto px-5 flex gap-1">
      {TABS.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`relative px-1 py-3 text-sm transition-colors ${
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            {active && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-volta rounded-full" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
