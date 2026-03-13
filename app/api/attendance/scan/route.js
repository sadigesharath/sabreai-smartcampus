import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export async function POST(req) {
  try {
    const { faculty_id, token } = await req.json()
    const { data: qr, error: qrErr } = await supabase
      .from('qr_tokens').select('*').eq('token', token).eq('is_used', false).single()
    if (qrErr || !qr) return Response.json({ success:false, message:'Invalid or expired QR code' }, { status:400 })
    const now    = new Date()
    const expiry = new Date(qr.expires_at)
    if (now > expiry) return Response.json({ success:false, message:'QR code has expired' }, { status:400 })
    const today = now.toISOString().split('T')[0]
    const { data: exists } = await supabase.from('attendance_logs')
      .select('id').eq('faculty_id',faculty_id).eq('period',qr.period).eq('date',today).single()
    if (exists) return Response.json({ success:false, message:'Already marked for this period' }, { status:400 })
    const scanTime = now.toTimeString().slice(0,5)
    const [sh,sm]  = qr.start_time?.split(':').map(Number) || [0,0]
    const startMin = sh*60+sm, nowMin = now.getHours()*60+now.getMinutes()
    const status   = nowMin > startMin+10 ? 'late' : 'present'
    await supabase.from('attendance_logs').insert({ faculty_id, period:qr.period, date:today, scan_time:scanTime, status, room:qr.room })
    await supabase.from('qr_tokens').update({ is_used:true }).eq('id', qr.id)
    return Response.json({ success:true, status, period:qr.period, room:qr.room })
  } catch (err) {
    return Response.json({ success:false, message:err.message }, { status:500 })
  }
}
