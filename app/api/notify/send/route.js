import webpush from 'web-push'
import { supabaseAdmin } from '../../../../lib/supabase'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL || 'mailto:admin@college.edu',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
)

export async function POST(req) {
  try {
    const { user_id, title, body, url } = await req.json()
    const admin = supabaseAdmin()

    const { data: sub } = await admin.from('push_subscriptions').select('subscription').eq('user_id', user_id).single()
    if (!sub) return Response.json({ success: false, error: 'No subscription found' })

    const payload = JSON.stringify({ title, body, url: url || '/dashboard', icon: '/icons/icon-192.png' })
    await webpush.sendNotification(JSON.parse(sub.subscription), payload)

    // Also save in notifications table
    await admin.from('notifications').insert({ user_id, message: body, type: 'push' })

    return Response.json({ success: true })
  } catch (e) {
    console.error('Push error:', e.message)
    return Response.json({ success: false, error: e.message }, { status: 500 })
  }
}
