import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'

let vapidSet = false

function ensureVapid() {
  if (vapidSet) return
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return
  webpush.setVapidDetails('mailto:admin@tennis.test', pub, priv)
  vapidSet = true
}

export async function sendPushToUser(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: SupabaseClient<any>,
  userId: string,
  payload: { title: string; body: string; url: string }
) {
  ensureVapid()
  if (!vapidSet) return

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (!subs?.length) return

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      )
    )
  )

  // 만료된 구독 삭제
  const expiredEndpoints = subs
    .filter((_, i) => {
      const r = results[i]
      return r.status === 'rejected' && (r.reason as { statusCode?: number })?.statusCode === 410
    })
    .map((s) => s.endpoint)

  if (expiredEndpoints.length) {
    await admin.from('push_subscriptions').delete().in('endpoint', expiredEndpoints)
  }
}
