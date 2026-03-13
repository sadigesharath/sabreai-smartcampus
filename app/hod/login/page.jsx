'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

const S = {
  page:  { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#07090f', padding: 16 },
  card:  { width: '100%', maxWidth: 390, background: '#0d1117', border: '1px solid #1f2937', borderRadius: 24, padding: '28px 24px' },
  input: { width: '100%', padding: '13px 16px', borderRadius: 12, background: '#111827', border: '1px solid #1f2937', color: '#f1f5f9', fontSize: 15, outline: 'none', boxSizing: 'border-box' },
  label: { display: 'block', fontSize: 11, color: '#64748b', marginBottom: 6, fontWeight: 700, letterSpacing: 1 },
  btn:   { width: '100%', padding: 14, borderRadius: 12, border: 'none', background: '#f59e0b', color: '#07090f', fontWeight: 700, fontSize: 15, cursor: 'pointer' },
  err:   { padding: '12px 16px', borderRadius: 12, background: '#ef444415', border: '1px solid #ef444433', color: '#ef4444', fontSize: 13, marginBottom: 16 },
}

export default function HODLogin() {
  const [tab, setTab]           = useState('password') // 'password' | 'otp'
  const [step, setStep]         = useState('email')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp]           = useState(['','','','','',''])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const router = useRouter()

  async function checkHOD(userId) {
    const { data: p } = await supabase.from('users').select('role').eq('id', userId).single()
    if (!p || p.role !== 'hod') {
      await supabase.auth.signOut()
      setError('Access denied. This portal is for HOD only.')
      return false
    }
    return true
  }

  async function loginPassword() {
    if (!email || !password) { setError('Fill in all fields'); return }
    setLoading(true); setError('')
    const { data, error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (e) { setError('Wrong email or password'); setLoading(false); return }
    if (await checkHOD(data.user.id)) router.replace('/hod')
    setLoading(false)
  }

  async function sendOTP() {
    if (!email) { setError('Enter your email'); return }
    setLoading(true); setError('')
    // First verify email is HOD
    const { data: p } = await supabase.from('users').select('role').eq('email', email.trim().toLowerCase()).single()
    if (!p || p.role !== 'hod') { setError('Not a HOD email.'); setLoading(false); return }
    const { error: e } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } })
    if (e) { setError(e.message); setLoading(false); return }
    setStep('otp'); setLoading(false)
  }

  async function verifyOTP() {
    const token = otp.join('')
    if (token.length < 6) { setError('Enter full 6-digit code'); return }
    setLoading(true); setError('')
    const { data, error: e } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: 'email' })
    if (e) { setError('Invalid or expired OTP.'); setLoading(false); return }
    if (await checkHOD(data.user.id)) router.replace('/hod')
    setLoading(false)
  }

  function otpChange(val, i) {
    if (!/^\d?$/.test(val)) return
    const n = [...otp]; n[i] = val; setOtp(n)
    if (val && i < 5) document.getElementById(`ho${i+1}`)?.focus()
  }
  function otpKey(e, i) { if (e.key === 'Backspace' && !otp[i] && i > 0) document.getElementById(`ho${i-1}`)?.focus() }

  return (
    <div style={S.page}>
      <div style={S.card}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#f59e0b,#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 16, fontWeight: 800, color: '#07090f' }}>HOD</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>Sabre<span style={{ color: '#f59e0b' }}>AI</span></h1>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>HOD Portal · Restricted Access</p>
        </div>

        <div style={{ padding: '10px 14px', borderRadius: 12, background: '#f59e0b11', border: '1px solid #f59e0b33', color: '#f59e0b', fontSize: 12, marginBottom: 20, textAlign: 'center' }}>
          🔒 Authorized Personnel Only
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: '#111827', borderRadius: 14, padding: 4, marginBottom: 20 }}>
          {[{id:'password',label:'🔑 Password'},{id:'otp',label:'📧 OTP Login'}].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setError(''); setStep('email'); setOtp(['','','','','','']) }}
              style={{ flex:1, padding: '8px 4px', borderRadius:10, border:'none', fontSize:13, fontWeight:600, cursor:'pointer',
                background: tab===t.id ? '#f59e0b' : 'transparent', color: tab===t.id ? '#07090f' : '#64748b' }}>
              {t.label}
            </button>
          ))}
        </div>

        {error && <div style={S.err}>{error}</div>}

        {/* Password tab */}
        {tab === 'password' && (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>HOD EMAIL</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="hod@college.edu" style={S.input} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={S.label}>PASSWORD</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loginPassword()} placeholder="••••••••" style={S.input} />
            </div>
            <button onClick={loginPassword} disabled={loading} style={{ ...S.btn, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Verifying…' : 'Login to Dashboard →'}
            </button>
          </>
        )}

        {/* OTP tab */}
        {tab === 'otp' && step === 'email' && (
          <>
            <div style={{ marginBottom: 20 }}>
              <label style={S.label}>HOD EMAIL</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendOTP()} placeholder="hod@college.edu" style={S.input} />
            </div>
            <button onClick={sendOTP} disabled={loading} style={{ ...S.btn, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Sending…' : 'Send OTP →'}
            </button>
          </>
        )}

        {tab === 'otp' && step === 'otp' && (
          <>
            <p style={{ textAlign:'center', fontSize:13, color:'#94a3b8', marginBottom:16 }}>
              Code sent to <span style={{ color:'#f59e0b' }}>{email}</span>
            </p>
            <div style={{ display:'flex', gap:8, justifyContent:'center', marginBottom:20 }}>
              {otp.map((v,i) => (
                <input key={i} id={`ho${i}`} maxLength={1} value={v} inputMode="numeric"
                  onChange={e => otpChange(e.target.value,i)} onKeyDown={e => otpKey(e,i)}
                  style={{ width:44, height:54, textAlign:'center', fontSize:22, fontWeight:700,
                    background:'#111827', border:`2px solid ${v?'#f59e0b':'#1f2937'}`,
                    borderRadius:12, color:'#f1f5f9', outline:'none' }} />
              ))}
            </div>
            <button onClick={verifyOTP} disabled={loading} style={{ ...S.btn, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Verifying…' : 'Access Dashboard →'}
            </button>
            <p onClick={() => { setStep('email'); setOtp(['','','','','','']); setError('') }}
              style={{ textAlign:'center', fontSize:13, color:'#f59e0b', marginTop:14, cursor:'pointer' }}>← Back</p>
          </>
        )}

        <p style={{ textAlign:'center', fontSize:12, color:'#475569', marginTop:18 }}>
          Faculty? <span onClick={() => router.push('/login')} style={{ color:'#00d4aa', cursor:'pointer', fontWeight:600 }}>Go to Faculty Login →</span>
        </p>
      </div>
    </div>
  )
}
