import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

webpush.setVapidDetails(
  'mailto:admin@sabreai.dev',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

export async function POST(req) {
  try {
    const { faculty_id, title, body, url } = await req.json()
    const { data: subs } = await supabase.from('push_subscriptions').select('subscription').eq('faculty_id', faculty_id)
    if (!subs || subs.length === 0) return Response.json({ success: false, message: 'No subscription found' })
    const payload = JSON.stringify({ title, body, url: url || '/dashboard' })
    const results = await Promise.allSettled(
      subs.map(s => webpush.sendNotification(JSON.parse(s.subscription), payload))
    )
    return Response.json({ success: true, results: results.length })
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}
