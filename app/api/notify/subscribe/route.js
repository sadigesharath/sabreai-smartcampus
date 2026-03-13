import { supabaseAdmin } from '../../../../lib/supabase'

export async function POST(req) {
  try {
    const { subscription, user_id } = await req.json()
    const admin = supabaseAdmin()
    await admin.from('push_subscriptions').upsert({ user_id, subscription: JSON.stringify(subscription), updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    return Response.json({ success: true })
  } catch (e) {
    return Response.json({ success: false, error: e.message }, { status: 500 })
  }
}
