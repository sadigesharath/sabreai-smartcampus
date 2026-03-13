'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

const STATUS_COLOR = { present:'#00d4aa', late:'#f59e0b', upcoming:'#3b82f6', future:'#475569' }

function timeToMin(t) { if (!t) return 0; const [h,m]=t.split(':').map(Number); return h*60+m }

export default function Dashboard() {
  const [user, setUser]           = useState(null)
  const [timetable, setTimetable] = useState([])
  const [subs, setSubs]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [pushEnabled, setPushEnabled] = useState(false)
  const router = useRouter()
  const notifiedRef = useRef(new Set())

  // ── Auth check ────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      const { data: profile } = await supabase
        .from('users').select('*').eq('id', session.user.id).single()
      if (!profile) { router.replace('/login'); return }
      if (profile.role === 'hod') { router.replace('/hod'); return }
      setUser(profile)
      await loadTimetable(session.user.id)
      await loadSubstitutes(session.user.id)
      await registerPush(session.user.id)
    }
    init()
  }, [])

  // ── Class reminder timer ───────────────────────────────────
  useEffect(() => {
    if (!timetable.length) return
    const interval = setInterval(() => checkUpcomingClasses(), 30000)
    checkUpcomingClasses()
    return () => clearInterval(interval)
  }, [timetable])

  function checkUpcomingClasses() {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (Notification.permission !== 'granted') return
    const now = new Date()
    const nowMin = now.getHours() * 60 + now.getMinutes()
    timetable.forEach(cls => {
      const startMin = timeToMin(cls.start_time)
      const diff = startMin - nowMin
      // Notify at 5 minutes before
      if (diff >= 4 && diff <= 6 && !notifiedRef.current.has(`pre-${cls.id}`)) {
        notifiedRef.current.add(`pre-${cls.id}`)
        new Notification('⏰ Class in 5 minutes!', {
          body: `${cls.subject} — Room ${cls.room}`,
          icon: '/icons/icon-192.png',
          tag: `pre-${cls.id}`,
        })
        // Also voice
        const speech = new SpeechSynthesisUtterance(`Reminder! ${cls.subject} starts in 5 minutes in Room ${cls.room}. Please get ready.`)
        speech.rate = 0.9
        window.speechSynthesis.speak(speech)
      }
    })
  }

  async function loadTimetable(uid) {
    const today = new Date().toLocaleDateString('en-US', { weekday:'long' })
    const { data } = await supabase.from('timetable').select('*').eq('faculty_id', uid).eq('day', today).order('period')
    setTimetable(data || [])
    setLoading(false)
  }

  async function loadSubstitutes(uid) {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('substitutions').select('*').eq('substitute_id', uid).eq('date', today)
    setSubs(data || [])
    if (data && data.length > 0) {
      // Voice notification for substitute assignment
      data.forEach(s => {
        if (!notifiedRef.current.has(`sub-${s.id}`)) {
          notifiedRef.current.add(`sub-${s.id}`)
          const speech = new SpeechSynthesisUtterance(`Alert! You have been assigned as substitute for ${s.subject} in Room ${s.room}. Please be ready.`)
          speech.rate = 0.9
          window.speechSynthesis.speak(speech)
        }
      })
    }
  }

  // ── Register push notifications ───────────────────────────
  async function registerPush(uid) {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    const pubKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!pubKey) return
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') return
      const reg = await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(pubKey)
        })
      }
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub, faculty_id: uid })
      })
      setPushEnabled(true)
    } catch (e) { console.log('Push registration failed:', e) }
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const raw     = window.atob(base64)
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
  }

  // ── Get period status ─────────────────────────────────────
  function getPeriodStatus(cls) {
    const now    = new Date()
    const nowMin = now.getHours()*60+now.getMinutes()
    const start  = timeToMin(cls.start_time)
    const end    = timeToMin(cls.end_time)
    if (nowMin >= start && nowMin <= end) return 'current'
    if (nowMin < start) return nowMin >= start-30 ? 'upcoming' : 'future'
    return 'done'
  }

  // ── Next class ────────────────────────────────────────────
  const now     = new Date()
  const nowMin  = now.getHours()*60+now.getMinutes()
  const nextCls = timetable.find(t => timeToMin(t.start_time) > nowMin)
  const currCls = timetable.find(t => {
    const s=timeToMin(t.start_time), e=timeToMin(t.end_time)
    return nowMin>=s && nowMin<=e
  })
  const focusCls = currCls || nextCls

  const greet = now.getHours()<12 ? 'Good morning' : now.getHours()<17 ? 'Good afternoon' : 'Good evening'
  const initials = user?.name?.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase() || '??'

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#07090f', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:36, height:36, border:'3px solid #00d4aa', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#07090f', maxWidth:480, margin:'0 auto', paddingBottom:100 }}>

      {/* Header */}
      <div style={{ padding:'20px 20px 0', display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <p style={{ fontSize:13, color:'#64748b', marginBottom:2 }}>{greet}</p>
          <h1 style={{ fontSize:20, fontWeight:800, color:'#f1f5f9', lineHeight:1.2 }}>{user?.name}</h1>
          <p style={{ fontSize:12, color:'#00d4aa', marginTop:2 }}>{user?.department}</p>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          {pushEnabled && <span style={{ fontSize:10, color:'#00d4aa', background:'#00d4aa15', border:'1px solid #00d4aa33', padding:'3px 8px', borderRadius:20 }}>🔔 On</span>}
          <div onClick={() => router.push('/dashboard/profile')}
            style={{ width:44, height:44, borderRadius:14, background:'linear-gradient(135deg,#00d4aa,#00b894)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:'#07090f', cursor:'pointer' }}>
            {initials}
          </div>
        </div>
      </div>

      {/* Substitute Alert Banner */}
      {subs.length > 0 && (
        <div style={{ margin:'16px 20px 0', padding:'14px 16px', borderRadius:16, background:'#f59e0b18', border:'1px solid #f59e0b44' }}>
          <p style={{ fontSize:13, fontWeight:700, color:'#f59e0b', marginBottom:4 }}>📢 Substitute Assignment Today</p>
          {subs.map((s,i) => (
            <p key={i} style={{ fontSize:12, color:'#cbd5e1' }}>Cover: <b>{s.subject}</b> · Room {s.room} · Period {s.period}</p>
          ))}
        </div>
      )}

      {/* Current / Next class card */}
      {focusCls ? (
        <div style={{ margin:'16px 20px 0', padding:'18px 20px', borderRadius:20, background:'linear-gradient(135deg,#00d4aa18,#00b89418)', border:'1px solid #00d4aa33' }}>
          <p style={{ fontSize:11, color:'#00d4aa', fontWeight:700, letterSpacing:1, marginBottom:6 }}>
            {currCls ? '📍 CURRENT CLASS' : '⏰ NEXT CLASS'}
          </p>
          <h2 style={{ fontSize:22, fontWeight:800, color:'#f1f5f9', marginBottom:4 }}>{focusCls.subject}</h2>
          <p style={{ fontSize:13, color:'#94a3b8', marginBottom:16 }}>Room {focusCls.room} · {focusCls.start_time} – {focusCls.end_time}</p>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => router.push('/dashboard/scanner')}
              style={{ flex:1, padding:'12px 0', borderRadius:14, border:'none', background:'#00d4aa', color:'#07090f', fontWeight:700, fontSize:14, cursor:'pointer' }}>
              📷 Scan QR Code
            </button>
            <button onClick={() => {
              const speech = new SpeechSynthesisUtterance(`${focusCls.subject} in Room ${focusCls.room} ${currCls ? 'is ongoing' : 'starts at ' + focusCls.start_time}`)
              speech.rate=0.9; window.speechSynthesis.speak(speech)
            }}
              style={{ width:46, padding:'12px 0', borderRadius:14, border:'1px solid #1f2937', background:'#111827', fontSize:20, cursor:'pointer' }}>
              🔔
            </button>
          </div>
        </div>
      ) : (
        <div style={{ margin:'16px 20px 0', padding:'18px 20px', borderRadius:20, background:'#0d1117', border:'1px solid #1f2937', textAlign:'center' }}>
          <p style={{ fontSize:32, marginBottom:8 }}>✅</p>
          <p style={{ color:'#94a3b8', fontSize:14 }}>All classes done for today!</p>
        </div>
      )}

      {/* Today's Schedule */}
      <div style={{ padding:'20px 20px 0' }}>
        <p style={{ fontSize:11, color:'#64748b', fontWeight:700, letterSpacing:1, marginBottom:12 }}>TODAY'S SCHEDULE</p>
        {timetable.length === 0 ? (
          <p style={{ color:'#475569', fontSize:14, textAlign:'center', padding:24 }}>No classes scheduled today</p>
        ) : (
          timetable.map(cls => {
            const st = getPeriodStatus(cls)
            const isCurr = st === 'current'
            const isDone = st === 'done'
            return (
              <div key={cls.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderRadius:16, marginBottom:10,
                background: isCurr ? '#00d4aa15' : '#0d1117',
                border: `1px solid ${isCurr ? '#00d4aa44' : '#1f2937'}` }}>
                <div style={{ width:36, height:36, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
                  background: isDone ? '#00d4aa22' : isCurr ? '#00d4aa' : '#1f2937' }}>
                  {isDone ? '✓' : isCurr ? '▶' : st==='upcoming' ? '⏰' : '○'}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:14, fontWeight:700, color: isDone?'#64748b' : '#f1f5f9', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cls.subject}</p>
                  <p style={{ fontSize:12, color:'#64748b' }}>Room {cls.room} · {cls.start_time} – {cls.end_time}</p>
                </div>
                <span style={{ fontSize:11, color:'#475569', fontWeight:600 }}>P{cls.period}</span>
              </div>
            )
          })
        )}
      </div>

      {/* Bottom Actions */}
      <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:480, padding:'12px 20px 24px', background:'linear-gradient(to top, #07090f 80%, transparent)', display:'flex', gap:10 }}>
        <button onClick={() => router.push('/dashboard/absent')}
          style={{ flex:1, padding:'13px 0', borderRadius:14, border:'1px solid #ef444433', background:'#ef444415', color:'#ef4444', fontWeight:700, fontSize:14, cursor:'pointer' }}>
          ✋ Mark Absent / Leave
        </button>
        <button onClick={async () => { await supabase.auth.signOut(); router.replace('/login') }}
          style={{ padding:'13px 18px', borderRadius:14, border:'1px solid #1f2937', background:'#111827', color:'#64748b', fontWeight:600, fontSize:14, cursor:'pointer' }}>
          Logout
        </button>
      </div>
    </div>
  )
}
