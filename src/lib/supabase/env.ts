const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function getSupabaseEnv() {
  if (!url || !anonKey) {
    throw new Error(
      [
        'Supabase 환경 변수가 없습니다.',
        'NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY 를 설정하세요.',
        '',
        'Docker: cp env.docker.example env.docker 후 docker compose up --build',
        '로컬: cp .env.local.example .env.local 후 supabase start 출력값 입력',
      ].join('\n')
    )
  }
  return { url, anonKey }
}
