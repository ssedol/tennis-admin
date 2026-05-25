import { redirect } from 'next/navigation'
import { SKIP_MUST_CHANGE_PASSWORD } from '@/lib/auth-config'

export default function ChangePasswordLayout({ children }: { children: React.ReactNode }) {
  if (SKIP_MUST_CHANGE_PASSWORD) redirect('/login')
  return children
}
