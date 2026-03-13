import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export async function POST(req) {
  try {
    const body = await req.json()
    const { substitute_id, absent_faculty_id, subject, room, period, date, start_time } = body
    const today = date || new Date().toISOString().split('T')[0]

    const { error } = await supabase.from('substitutions').insert({
      substitute_id, absent_faculty_id, subject, room, period, date: today
    })
    if (error) return Response.json({ success:false, error:error.message }, { status:500 })

    // Send push notification to substitute faculty
    try {
      const { data: subs } = await supabase.from('push_subscriptions').select('subscription').eq('faculty_id', substitute_id)
      const { data: faculty } = await supabase.from('users').select('name').eq('id', substitute_id).single()
      if (subs && subs.length > 0 && process.env.VAPID_PRIVATE_KEY) {
        webpush.setVapidDetails('mailto:admin@sabreai.dev', process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY)
        const payload = JSON.stringify({
          title: '📢 Substitute Assignment',
          body: `You are assigned to cover ${subject} in Room ${room} at ${start_time || 'soon'}. Please be ready!`,
          url: '/dashboard'
        })
        await Promise.allSettled(subs.map(s => webpush.sendNotification(JSON.parse(s.subscription), payload)))
      }
    } catch (pushErr) { console.log('Push failed (ok):', pushErr.message) }

    return Response.json({ success:true })
  } catch (err) {
    return Response.json({ success:false, error:err.message }, { status:500 })
  }
}
