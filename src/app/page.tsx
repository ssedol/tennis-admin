import { redirect } from 'next/navigation'

// 루트 접근 시 미들웨어가 역할별 페이지로 리다이렉트
// 미들웨어가 처리하지 못한 경우의 폴백
export default function RootPage() {
  redirect('/login')
}
