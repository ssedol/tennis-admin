#!/bin/sh
set -e

# Next.js는 .env.local 을 읽지만, Docker env_file 만으로는 클라이언트 번들에 안 들어가는 경우가 있음
if [ -f /app/env.docker ]; then
  set -a
  # shellcheck disable=SC1091
  . /app/env.docker
  set +a
fi

if [ -f /app/.env.local ]; then
  set -a
  # shellcheck disable=SC1091
  . /app/.env.local
  set +a
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
  echo "ERROR: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 가 비어 있습니다."
  echo "       프로젝트 루트에 env.docker 파일이 있는지 확인하세요."
  exit 1
fi

echo "Supabase URL: $NEXT_PUBLIC_SUPABASE_URL"
exec "$@"
