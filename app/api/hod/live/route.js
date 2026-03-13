import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export async function GET() {
  try {
    const today    = new Date().toISOString().split('T')[0]
    const todayDay = new Date().toLocaleDateString('en-US', { weekday: 'long' })
    const now      = new Date()
    const [{ data: faculty }, { data: timetable }, { data: logs }, { data: leaves }] = await Promise.all([
      supabase.from('users').select('id,name,email,department').eq('role','faculty'),
      supabase.from('timetable').select('*').eq('day', todayDay),
      supabase.from('attendance_logs').select('*').eq('date', today),
      supabase.from('leave_requests').select('*').eq('date', today),
    ])
    const currentPeriods = (timetable||[]).filter(t => {
      const [sh,sm] = t.start_time.split(':').map(Number)
      const [eh,em] = t.end_time.split(':').map(Number)
      const s = new Date(); s.setHours(sh,sm,0)
      const e = new Date(); e.setHours(eh,em,0)
      return now >= s && now <= e
    })
    const result = (faculty||[]).map(f => {
      const leave  = (leaves||[]).find(l => l.faculty_id===f.id)
      const period = currentPeriods.find(t => t.faculty_id===f.id)
      const scan   = period ? (logs||[]).find(l => l.faculty_id===f.id && l.period===period.period) : null
      let status = 'free'
      if (leave) status='absent'
      else if (scan) status='in-class'
      else if (period) status='not-started'
      return { id:f.id, name:f.name, department:f.department, status, room:period?.room||'—', subject:period?.subject||null, scan_time:scan?.scan_time||null, late:scan?.status==='late', leave_type:leave?.leave_type||null }
    })
    return Response.json({ success:true, data:result, day:todayDay })
  } catch (err) {
    return Response.json({ success:false, message:err.message }, { status:500 })
  }
}
