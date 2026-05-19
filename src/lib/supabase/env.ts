export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!url || !anonKey) {
    throw new Error(
      [
        'Supabase 환경 변수가 없습니다.',
        'NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY 를 설정하세요.',
        '',
        'Docker: env.docker 확인 후 docker compose down && docker compose up --build',
        '로컬: .env.local 확인 후 npm run dev',
      ].join('\n')
    )
  }

  return { url, anonKey }
}
