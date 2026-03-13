'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function Profile() {
  const [user, setUser]     = useState(null)
  const [editing, setEditing] = useState(false)
  const [name, setName]     = useState('')
  const [dept, setDept]     = useState('')
  const [phone, setPhone]   = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg]       = useState('')
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/login'); return }
      const { data: p } = await supabase.from('users').select('*').eq('id', session.user.id).single()
      if (!p) { router.replace('/login'); return }
      setUser({ ...p, email: session.user.email })
      setName(p.name || ''); setDept(p.department || ''); setPhone(p.phone || '')
    })
  }, [])

  async function save() {
    setSaving(true); setMsg('')
    const { error } = await supabase.from('users').update({ name: name.trim(), department: dept.trim(), phone: phone.trim() }).eq('id', user.id)
    if (error) setMsg('Error saving. Try again.')
    else { setMsg('Profile updated! ✅'); setUser(u => ({ ...u, name, department: dept, phone })); setEditing(false) }
    setSaving(false)
  }

  const initials = user?.name?.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase() || '??'

  const S = {
    input: { width:'100%', padding:'13px 16px', borderRadius:12, background:'#111827', border:'1px solid #1f2937', color:'#f1f5f9', fontSize:15, outline:'none', boxSizing:'border-box' },
    label: { display:'block', fontSize:11, color:'#64748b', marginBottom:6, fontWeight:700, letterSpacing:1 },
    row:   { padding:'16px 0', borderBottom:'1px solid #1f2937', display:'flex', justifyContent:'space-between', alignItems:'center' },
  }

  if (!user) return (
    <div style={{ minHeight:'100vh', background:'#07090f', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:36, height:36, border:'3px solid #00d4aa', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#07090f', maxWidth:480, margin:'0 auto', padding:'0 0 40px' }}>
      {/* Header */}
      <div style={{ padding:'20px 20px 0', display:'flex', alignItems:'center', gap:14 }}>
        <button onClick={() => router.back()} style={{ background:'none', border:'none', color:'#64748b', fontSize:22, cursor:'pointer', padding:0 }}>←</button>
        <h1 style={{ fontSize:20, fontWeight:800, color:'#f1f5f9' }}>My Profile</h1>
      </div>

      {/* Avatar */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'28px 20px 0' }}>
        <div style={{ width:80, height:80, borderRadius:24, background:'linear-gradient(135deg,#00d4aa,#00b894)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, fontWeight:800, color:'#07090f', marginBottom:12 }}>
          {initials}
        </div>
        <h2 style={{ fontSize:20, fontWeight:800, color:'#f1f5f9', marginBottom:4 }}>{user.name}</h2>
        <span style={{ fontSize:12, color:'#00d4aa', background:'#00d4aa15', padding:'4px 12px', borderRadius:20, border:'1px solid #00d4aa33' }}>
          {user.role?.toUpperCase()}
        </span>
      </div>

      {/* Info Cards */}
      <div style={{ margin:'24px 20px 0', background:'#0d1117', border:'1px solid #1f2937', borderRadius:20, padding:'0 16px' }}>
        <div style={S.row}>
          <p style={{ fontSize:12, color:'#64748b' }}>EMAIL</p>
          <p style={{ fontSize:14, color:'#f1f5f9', fontWeight:600 }}>{user.email}</p>
        </div>
        <div style={S.row}>
          <p style={{ fontSize:12, color:'#64748b' }}>DEPARTMENT</p>
          <p style={{ fontSize:14, color:'#f1f5f9', fontWeight:600 }}>{user.department || '—'}</p>
        </div>
        <div style={S.row}>
          <p style={{ fontSize:12, color:'#64748b' }}>PHONE</p>
          <p style={{ fontSize:14, color:'#f1f5f9', fontWeight:600 }}>{user.phone || '—'}</p>
        </div>
        <div style={{ ...S.row, border:'none' }}>
          <p style={{ fontSize:12, color:'#64748b' }}>MEMBER SINCE</p>
          <p style={{ fontSize:14, color:'#f1f5f9', fontWeight:600 }}>{user.created_at ? new Date(user.created_at).toLocaleDateString('en-IN') : '—'}</p>
        </div>
      </div>

      {/* Edit Form */}
      {editing ? (
        <div style={{ margin:'20px 20px 0', background:'#0d1117', border:'1px solid #1f2937', borderRadius:20, padding:20 }}>
          <h3 style={{ fontSize:16, fontWeight:700, color:'#f1f5f9', marginBottom:16 }}>Edit Profile</h3>
          {msg && <div style={{ padding:'10px 14px', borderRadius:10, background:'#00d4aa15', border:'1px solid #00d4aa33', color:'#00d4aa', fontSize:13, marginBottom:14 }}>{msg}</div>}
          <div style={{ marginBottom:14 }}>
            <label style={S.label}>FULL NAME</label>
            <input value={name} onChange={e => setName(e.target.value)} style={S.input} />
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={S.label}>DEPARTMENT</label>
            <select value={dept} onChange={e => setDept(e.target.value)} style={{ ...S.input, appearance:'none' }}>
              {['Computer Science','Electronics','Mechanical','Civil','Electrical','Mathematics','Physics','Chemistry','MBA','MCA'].map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={S.label}>PHONE</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="9876543210" style={S.input} />
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={save} disabled={saving} style={{ flex:1, padding:13, borderRadius:12, border:'none', background:'#00d4aa', color:'#07090f', fontWeight:700, fontSize:14, cursor:'pointer', opacity:saving?0.7:1 }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button onClick={() => setEditing(false)} style={{ padding:'13px 16px', borderRadius:12, border:'1px solid #1f2937', background:'#111827', color:'#64748b', fontWeight:600, fontSize:14, cursor:'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={{ margin:'20px 20px 0' }}>
          {msg && <div style={{ padding:'10px 14px', borderRadius:10, background:'#00d4aa15', border:'1px solid #00d4aa33', color:'#00d4aa', fontSize:13, marginBottom:14 }}>{msg}</div>}
          <button onClick={() => setEditing(true)} style={{ width:'100%', padding:14, borderRadius:14, border:'1px solid #1f2937', background:'#0d1117', color:'#f1f5f9', fontWeight:600, fontSize:14, cursor:'pointer' }}>
            ✏️ Edit Profile
          </button>
        </div>
      )}

      {/* Logout */}
      <div style={{ margin:'14px 20px 0' }}>
        <button onClick={async () => { await supabase.auth.signOut(); router.replace('/login') }}
          style={{ width:'100%', padding:14, borderRadius:14, border:'1px solid #ef444433', background:'#ef444415', color:'#ef4444', fontWeight:700, fontSize:14, cursor:'pointer' }}>
          Logout
        </button>
      </div>
    </div>
  )
}
