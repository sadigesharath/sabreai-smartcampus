'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function MarkAbsent() {
  const [type, setType]     = useState('sick')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone]     = useState(false)
  const router = useRouter()

  async function submit() {
    if (!reason.trim()) { alert('Please enter a reason'); return }
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }
    const today = new Date().toISOString().split('T')[0]
    const { error } = await supabase.from('leave_requests').insert({
      faculty_id: session.user.id, date: today, reason: reason.trim(), leave_type: type, status: 'pending'
    })
    if (error) { alert('Error submitting: ' + error.message); setLoading(false); return }
    setDone(true); setLoading(false)
  }

  const types = [
    { id:'sick',       label:'🤒 Sick Leave',       color:'#ef4444' },
    { id:'medical',    label:'🏥 Medical',           color:'#f59e0b' },
    { id:'personal',   label:'👤 Personal',          color:'#3b82f6' },
    { id:'emergency',  label:'🚨 Emergency',         color:'#8b5cf6' },
    { id:'official',   label:'🏛️ Official Duty',    color:'#00d4aa' },
  ]

  if (done) return (
    <div style={{ minHeight:'100vh', background:'#07090f', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:20, textAlign:'center' }}>
      <div style={{ fontSize:60, marginBottom:16 }}>✅</div>
      <h2 style={{ fontSize:20, fontWeight:800, color:'#f1f5f9', marginBottom:8 }}>Leave Submitted!</h2>
      <p style={{ fontSize:14, color:'#64748b', marginBottom:24 }}>HOD has been notified and will assign a substitute.</p>
      <button onClick={() => router.replace('/dashboard')} style={{ padding:'13px 28px', borderRadius:14, border:'none', background:'#00d4aa', color:'#07090f', fontWeight:700, fontSize:15, cursor:'pointer' }}>
        Back to Dashboard
      </button>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#07090f', maxWidth:480, margin:'0 auto', padding:'0 0 40px' }}>
      <div style={{ padding:'20px 20px 0', display:'flex', alignItems:'center', gap:14 }}>
        <button onClick={() => router.back()} style={{ background:'none', border:'none', color:'#64748b', fontSize:22, cursor:'pointer', padding:0 }}>←</button>
        <h1 style={{ fontSize:20, fontWeight:800, color:'#f1f5f9' }}>Mark Leave / Absent</h1>
      </div>

      <div style={{ padding:'24px 20px 0' }}>
        <p style={{ fontSize:11, color:'#64748b', fontWeight:700, letterSpacing:1, marginBottom:12 }}>LEAVE TYPE</p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:24 }}>
          {types.map(t => (
            <button key={t.id} onClick={() => setType(t.id)}
              style={{ padding:'13px 10px', borderRadius:14, border:`2px solid ${type===t.id ? t.color : '#1f2937'}`,
                background: type===t.id ? t.color+'22' : '#0d1117', color: type===t.id ? t.color : '#64748b',
                fontWeight:600, fontSize:13, cursor:'pointer', textAlign:'left' }}>
              {t.label}
            </button>
          ))}
        </div>

        <p style={{ fontSize:11, color:'#64748b', fontWeight:700, letterSpacing:1, marginBottom:8 }}>REASON</p>
        <textarea value={reason} onChange={e => setReason(e.target.value)}
          placeholder="Brief reason for leave..."
          rows={4}
          style={{ width:'100%', padding:'13px 16px', borderRadius:14, background:'#111827', border:'1px solid #1f2937', color:'#f1f5f9', fontSize:14, outline:'none', resize:'none', boxSizing:'border-box', fontFamily:'inherit' }} />

        <button onClick={submit} disabled={loading}
          style={{ width:'100%', marginTop:20, padding:15, borderRadius:14, border:'none', background:'#ef4444', color:'#fff', fontWeight:700, fontSize:15, cursor:loading?'not-allowed':'pointer', opacity:loading?0.7:1 }}>
          {loading ? 'Submitting…' : 'Submit Leave Request'}
        </button>

        <p style={{ fontSize:12, color:'#475569', textAlign:'center', marginTop:14 }}>HOD will be notified immediately</p>
      </div>
    </div>
  )
}
