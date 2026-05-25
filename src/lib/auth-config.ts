/** 개발(npm run dev) 또는 SKIP_MUST_CHANGE_PASSWORD=true 일 때 첫 로그인 비밀번호 변경 생략 */
export const SKIP_MUST_CHANGE_PASSWORD =
  process.env.NODE_ENV === 'development' ||
  process.env.SKIP_MUST_CHANGE_PASSWORD === 'true'
