'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

const STATUS_CFG = {
  'in-class':    { bg:'#00d4aa18', border:'#00d4aa44', color:'#00d4aa', label:'In Class' },
  'not-started': { bg:'#f59e0b18', border:'#f59e0b44', color:'#f59e0b', label:'Not Started' },
  'free':        { bg:'#3b82f618', border:'#3b82f644', color:'#3b82f6', label:'Free' },
  'absent':      { bg:'#ef444418', border:'#ef444444', color:'#ef4444', label:'Absent' },
}

function Badge({ status }) {
  const c = STATUS_CFG[status] || STATUS_CFG['free']
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600, background:c.bg, color:c.color, border:`1px solid ${c.border}` }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:c.color }} />{c.label}
    </span>
  )
}

export default function HODDashboard() {
  const [faculty, setFaculty]       = useState([])
  const [leaves, setLeaves]         = useState([])
  const [allFaculty, setAllFaculty] = useState([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState('live')
  const [selected, setSelected]     = useState(null)
  const [subId, setSubId]           = useState('')
  const [assigned, setAssigned]     = useState({})
  const [actionLoading, setActionLoading] = useState(false)
  const router = useRouter()

  // Guard: HOD only
  useEffect(() => {
    async function checkHOD() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/hod/login'); return }
      const { data: p } = await supabase.from('users').select('role').eq('id', session.user.id).single()
      if (!p || p.role !== 'hod') { router.replace('/hod/login'); return }
      fetchAll()
    }
    checkHOD()
  }, [])

  const fetchAll = useCallback(async () => {
    const [liveRes, leavesRes, facultyRes] = await Promise.all([
      fetch('/api/hod/live').then(r => r.json()),
      supabase.from('leave_requests').select('*, users(name, department)').eq('date', new Date().toISOString().split('T')[0]).order('created_at', { ascending:false }),
      supabase.from('users').select('id, name, department').eq('role','faculty'),
    ])
    setFaculty(liveRes.data || [])
    setLeaves(leavesRes.data || [])
    setAllFaculty(facultyRes.data || [])
    setLoading(false)
  }, [])

  // Auto refresh every 30s
  useEffect(() => {
    const id = setInterval(fetchAll, 30000)
    return () => clearInterval(id)
  }, [fetchAll])

  async function assignSubstitute(absentFacultyId, absentFaculty) {
    if (!subId) { alert('Select a substitute'); return }
    setActionLoading(true)
    const res = await fetch('/api/hod/substitute', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        substitute_id: subId, absent_faculty_id: absentFacultyId,
        subject: absentFaculty.subject || 'Class', room: absentFaculty.room,
        period: 1, date: new Date().toISOString().split('T')[0],
        start_time: 'soon'
      })
    })
    const json = await res.json()
    if (json.success) {
      setAssigned(a => ({ ...a, [absentFacultyId]: subId }))
      setSelected(null); setSubId('')
      alert('✅ Substitute assigned! Faculty notified via push notification.')
    } else {
      alert('Error: ' + (json.error || 'Failed'))
    }
    setActionLoading(false)
  }

  async function handleLeaveAction(leaveId, status) {
    setActionLoading(true)
    await supabase.from('leave_requests').update({ status }).eq('id', leaveId)
    setLeaves(l => l.map(r => r.id === leaveId ? { ...r, status } : r))
    setActionLoading(false)
  }

  const counts = {
    'in-class':    faculty.filter(f => f.status==='in-class').length,
    'not-started': faculty.filter(f => f.status==='not-started').length,
    'free':        faculty.filter(f => f.status==='free').length,
    'absent':      faculty.filter(f => f.status==='absent').length,
  }

  const STATS = [
    { label:'In Class',    count:counts['in-class'],    color:'#00d4aa' },
    { label:'Not Started', count:counts['not-started'], color:'#f59e0b' },
    { label:'Free',        count:counts['free'],        color:'#3b82f6' },
    { label:'Absent',      count:counts['absent'],      color:'#ef4444' },
  ]

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#07090f', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:36, height:36, border:'3px solid #f59e0b', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#07090f', maxWidth:900, margin:'0 auto', padding:'24px 20px 40px', position:'relative' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:800, color:'#f1f5f9' }}>HOD Dashboard</h1>
          <p style={{ fontSize:13, color:'#64748b' }}>Live Faculty Monitoring</p>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:20, background:'#00d4aa18', border:'1px solid #00d4aa33', color:'#00d4aa', fontSize:12, fontWeight:600 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:'#00d4aa', animation:'pulse 2s infinite' }} />LIVE
          </span>
          <button onClick={async () => { await supabase.auth.signOut(); router.replace('/hod/login') }}
            style={{ padding:'8px 16px', borderRadius:10, border:'1px solid #1f2937', background:'#111827', color:'#64748b', fontSize:13, cursor:'pointer' }}>
            Logout
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
        {STATS.map(s => (
          <div key={s.label} style={{ background:'#0d1117', border:'1px solid #1f2937', borderRadius:16, padding:'16px 20px' }}>
            <p style={{ fontSize:32, fontWeight:800, color:s.color }}>{s.count}</p>
            <p style={{ fontSize:12, color:'#64748b', marginTop:4 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, background:'#0d1117', border:'1px solid #1f2937', borderRadius:16, padding:4, marginBottom:20 }}>
        {[{id:'live',label:'Live Monitor'},{id:'leave',label:`Leave Requests ${leaves.filter(l=>l.status==='pending').length > 0 ? '('+leaves.filter(l=>l.status==='pending').length+')' : ''}`}].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex:1, padding:'10px 0', borderRadius:12, border:'none', fontSize:14, fontWeight:600, cursor:'pointer',
              background: tab===t.id ? '#f59e0b' : 'transparent', color: tab===t.id ? '#07090f' : '#64748b' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Live Monitor Tab */}
      {tab === 'live' && (
        <div style={{ background:'#0d1117', border:'1px solid #1f2937', borderRadius:20, overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 2fr 1fr 1.5fr 2fr', padding:'12px 20px', borderBottom:'1px solid #1f2937' }}>
            {['FACULTY','CLASS','ROOM','STATUS','ACTION'].map(h => (
              <p key={h} style={{ fontSize:11, color:'#475569', fontWeight:700, letterSpacing:1 }}>{h}</p>
            ))}
          </div>
          {faculty.length === 0 ? (
            <p style={{ textAlign:'center', padding:40, color:'#475569' }}>No faculty data. Make sure timetable is added in Supabase.</p>
          ) : (
            faculty.map(f => (
              <div key={f.id}>
                <div style={{ display:'grid', gridTemplateColumns:'2fr 2fr 1fr 1.5fr 2fr', padding:'16px 20px', borderBottom:'1px solid #0d1117', alignItems:'center',
                  background: selected===f.id ? '#f59e0b08' : 'transparent' }}>
                  <div>
                    <p style={{ fontSize:14, fontWeight:700, color:'#f1f5f9' }}>{f.name}</p>
                    <p style={{ fontSize:11, color: f.leave_type ? '#ef4444' : '#64748b' }}>{f.leave_type ? f.leave_type+' leave' : f.department}</p>
                  </div>
                  <p style={{ fontSize:13, color:'#94a3b8' }}>{f.subject || '—'}</p>
                  <p style={{ fontSize:13, color:'#94a3b8' }}>{f.room}</p>
                  <Badge status={f.status} />
                  <div style={{ display:'flex', gap:8 }}>
                    {(f.status==='absent' || f.status==='not-started') && !assigned[f.id] && (
                      <button onClick={() => setSelected(selected===f.id ? null : f.id)}
                        style={{ padding:'6px 14px', borderRadius:10, border:'1px solid #f59e0b44', background:'#f59e0b15', color:'#f59e0b', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                        Assign Sub
                      </button>
                    )}
                    {assigned[f.id] && <span style={{ fontSize:12, color:'#00d4aa', fontWeight:600 }}>✓ Assigned</span>}
                  </div>
                </div>

                {/* Substitute selector */}
                {selected === f.id && (
                  <div style={{ padding:'14px 20px', background:'#111827', borderBottom:'1px solid #1f2937' }}>
                    <p style={{ fontSize:12, color:'#64748b', marginBottom:10 }}>Select substitute for <b style={{ color:'#f59e0b' }}>{f.name}</b>:</p>
                    <div style={{ display:'flex', gap:10 }}>
                      <select value={subId} onChange={e => setSubId(e.target.value)}
                        style={{ flex:1, padding:'10px 14px', borderRadius:10, background:'#0d1117', border:'1px solid #1f2937', color:'#f1f5f9', fontSize:13, outline:'none' }}>
                        <option value="">Choose faculty…</option>
                        {allFaculty.filter(af => af.id !== f.id).map(af => (
                          <option key={af.id} value={af.id}>{af.name} — {af.department}</option>
                        ))}
                      </select>
                      <button onClick={() => assignSubstitute(f.id, f)} disabled={actionLoading}
                        style={{ padding:'10px 20px', borderRadius:10, border:'none', background:'#f59e0b', color:'#07090f', fontWeight:700, fontSize:13, cursor:'pointer', opacity:actionLoading?0.7:1 }}>
                        {actionLoading ? '…' : 'Assign →'}
                      </button>
                      <button onClick={() => setSelected(null)} style={{ padding:'10px 14px', borderRadius:10, border:'1px solid #1f2937', background:'none', color:'#64748b', cursor:'pointer' }}>✕</button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Leave Requests Tab */}
      {tab === 'leave' && (
        <div>
          {leaves.length === 0 ? (
            <div style={{ background:'#0d1117', border:'1px solid #1f2937', borderRadius:20, padding:40, textAlign:'center' }}>
              <p style={{ fontSize:32, marginBottom:8 }}>📭</p>
              <p style={{ color:'#475569' }}>No leave requests today.</p>
            </div>
          ) : (
            leaves.map(l => (
              <div key={l.id} style={{ background:'#0d1117', border:'1px solid #1f2937', borderRadius:16, padding:20, marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                  <div>
                    <p style={{ fontSize:16, fontWeight:700, color:'#f1f5f9', marginBottom:2 }}>{l.users?.name}</p>
                    <p style={{ fontSize:12, color:'#64748b' }}>{l.users?.department}</p>
                  </div>
                  <span style={{ padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:600,
                    background: l.status==='approved'?'#00d4aa22': l.status==='rejected'?'#ef444422':'#f59e0b22',
                    color: l.status==='approved'?'#00d4aa': l.status==='rejected'?'#ef4444':'#f59e0b',
                    border: `1px solid ${l.status==='approved'?'#00d4aa44': l.status==='rejected'?'#ef444444':'#f59e0b44'}` }}>
                    {l.status?.charAt(0).toUpperCase()+l.status?.slice(1)}
                  </span>
                </div>
                <div style={{ padding:'10px 14px', borderRadius:10, background:'#111827', marginBottom:12 }}>
                  <p style={{ fontSize:12, color:'#64748b', marginBottom:4 }}>Type: <span style={{ color:'#f1f5f9' }}>{l.leave_type}</span></p>
                  <p style={{ fontSize:13, color:'#94a3b8' }}>{l.reason}</p>
                </div>
                {l.status === 'pending' && (
                  <div style={{ display:'flex', gap:10 }}>
                    <button onClick={() => handleLeaveAction(l.id,'approved')} disabled={actionLoading}
                      style={{ flex:1, padding:11, borderRadius:10, border:'none', background:'#00d4aa', color:'#07090f', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                      ✅ Approve
                    </button>
                    <button onClick={() => handleLeaveAction(l.id,'rejected')} disabled={actionLoading}
                      style={{ flex:1, padding:11, borderRadius:10, border:'1px solid #ef444433', background:'#ef444415', color:'#ef4444', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                      ❌ Reject
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  )
}
