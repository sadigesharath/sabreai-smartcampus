import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export async function POST(req) {
  try {
    const { subscription, faculty_id } = await req.json()
    await supabase.from('push_subscriptions').upsert({ faculty_id, subscription: JSON.stringify(subscription) }, { onConflict: 'faculty_id' })
    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}
