'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

const S = {
  page:  { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#07090f', padding: '16px', paddingTop: '32px', paddingBottom: '32px' },
  card:  { width: '100%', maxWidth: 400, background: '#0d1117', border: '1px solid #1f2937', borderRadius: 24, padding: '28px 24px' },
  input: { width: '100%', padding: '13px 16px', borderRadius: 12, background: '#111827', border: '1px solid #1f2937', color: '#f1f5f9', fontSize: 15, outline: 'none', boxSizing: 'border-box' },
  label: { display: 'block', fontSize: 11, color: '#64748b', marginBottom: 6, fontWeight: 700, letterSpacing: 1 },
  btn:   { width: '100%', padding: 14, borderRadius: 12, border: 'none', background: '#00d4aa', color: '#07090f', fontWeight: 700, fontSize: 15, cursor: 'pointer' },
  err:   { padding: '12px 16px', borderRadius: 12, background: '#ef444415', border: '1px solid #ef444433', color: '#ef4444', fontSize: 13, marginBottom: 16 },
  ok:    { padding: '12px 16px', borderRadius: 12, background: '#00d4aa15', border: '1px solid #00d4aa33', color: '#00d4aa', fontSize: 13, marginBottom: 16 },
}

export default function FacultyLogin() {
  const [tab, setTab]         = useState('otp')      // 'otp' | 'password' | 'create'
  const [step, setStep]       = useState('email')    // 'email' | 'otp'
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]       = useState('')
  const [dept, setDept]       = useState('')
  const [otp, setOtp]         = useState(['','','','','',''])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  function resetAll() { setError(''); setSuccess(''); setStep('email'); setOtp(['','','','','','']) }

  // ── OTP Login ──────────────────────────────────────────────
  async function sendOTP() {
    if (!email) { setError('Enter your email'); return }
    setLoading(true); setError('')
    const { data: profile } = await supabase.from('users').select('role').eq('email', email.trim().toLowerCase()).single()
    if (!profile) { setError('Email not registered. Ask HOD to add you.'); setLoading(false); return }
    if (profile.role === 'hod') { setError('Use HOD portal to login.'); setLoading(false); return }
    const { error: e } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } })
    if (e) { setError(e.message); setLoading(false); return }
    setStep('otp'); setLoading(false)
  }

  async function verifyOTP() {
    const token = otp.join('')
    if (token.length < 6) { setError('Enter full 6-digit code'); return }
    setLoading(true); setError('')
    const { error: e } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: 'email' })
    if (e) { setError('Invalid or expired OTP. Try again.'); setLoading(false); return }
    router.replace('/dashboard')
  }

  // ── Password Login ─────────────────────────────────────────
  async function loginPassword() {
    if (!email || !password) { setError('Fill in all fields'); return }
    setLoading(true); setError('')
    const { data, error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (e) { setError('Wrong email or password'); setLoading(false); return }
    const { data: profile } = await supabase.from('users').select('role').eq('id', data.user.id).single()
    if (profile?.role === 'hod') { router.replace('/hod'); return }
    router.replace('/dashboard')
  }

  // ── Create Account ─────────────────────────────────────────
  async function createAccount() {
    if (!name || !email || !password || !dept) { setError('Fill in all fields'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true); setError('')
    const { data, error: e } = await supabase.auth.signUp({ email: email.trim(), password })
    if (e) { setError(e.message); setLoading(false); return }
    const { error: e2 } = await supabase.from('users').insert({
      id: data.user.id, name: name.trim(), email: email.trim().toLowerCase(),
      role: 'faculty', department: dept.trim()
    })
    if (e2) { setError('Account created but profile failed. Contact HOD.'); setLoading(false); return }
    setSuccess('Account created! Check your email to verify, then login.'); setLoading(false)
  }

  // ── OTP digit input ────────────────────────────────────────
  function otpChange(val, i) {
    if (!/^\d?$/.test(val)) return
    const n = [...otp]; n[i] = val; setOtp(n)
    if (val && i < 5) document.getElementById(`fo${i+1}`)?.focus()
  }
  function otpKey(e, i) { if (e.key === 'Backspace' && !otp[i] && i > 0) document.getElementById(`fo${i-1}`)?.focus() }

  const TABS = [
    { id: 'otp',      label: '📧 OTP Login' },
    { id: 'password', label: '🔑 Password' },
    { id: 'create',   label: '✨ Register' },
  ]

  return (
    <div style={S.page}>
      <div style={S.card}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#00d4aa,#00b894)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 24 }}>🎓</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>Sabre<span style={{ color: '#00d4aa' }}>AI</span></h1>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Faculty Portal</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: '#111827', borderRadius: 14, padding: 4, marginBottom: 24 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); resetAll() }}
              style={{ flex: 1, padding: '8px 4px', borderRadius: 10, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: tab === t.id ? '#00d4aa' : 'transparent',
                color: tab === t.id ? '#07090f' : '#64748b' }}>
              {t.label}
            </button>
          ))}
        </div>

        {error   && <div style={S.err}>{error}</div>}
        {success && <div style={S.ok}>{success}</div>}

        {/* ── OTP Tab ── */}
        {tab === 'otp' && step === 'email' && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>FACULTY EMAIL</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendOTP()}
                placeholder="faculty@college.edu" style={S.input} />
              <p style={{ fontSize: 12, color: '#475569', marginTop: 6 }}>We'll send a 6-digit OTP to your email</p>
            </div>
            <button onClick={sendOTP} disabled={loading} style={{ ...S.btn, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Sending…' : 'Send OTP →'}
            </button>
          </>
        )}

        {tab === 'otp' && step === 'otp' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 32, marginBottom: 6 }}>📬</div>
              <p style={{ fontSize: 13, color: '#94a3b8' }}>Code sent to <span style={{ color: '#00d4aa' }}>{email}</span></p>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
              {otp.map((v, i) => (
                <input key={i} id={`fo${i}`} maxLength={1} value={v} inputMode="numeric"
                  onChange={e => otpChange(e.target.value, i)} onKeyDown={e => otpKey(e, i)}
                  style={{ width: 44, height: 54, textAlign: 'center', fontSize: 22, fontWeight: 700,
                    background: '#111827', border: `2px solid ${v ? '#00d4aa' : '#1f2937'}`,
                    borderRadius: 12, color: '#f1f5f9', outline: 'none' }} />
              ))}
            </div>
            <button onClick={verifyOTP} disabled={loading} style={{ ...S.btn, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Verifying…' : 'Verify & Login →'}
            </button>
            <p onClick={() => { setStep('email'); setOtp(['','','','','','']); setError('') }}
              style={{ textAlign: 'center', fontSize: 13, color: '#00d4aa', marginTop: 14, cursor: 'pointer' }}>← Change email</p>
          </>
        )}

        {/* ── Password Tab ── */}
        {tab === 'password' && (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>EMAIL</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="faculty@college.edu" style={S.input} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={S.label}>PASSWORD</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loginPassword()} placeholder="••••••••" style={S.input} />
            </div>
            <button onClick={loginPassword} disabled={loading} style={{ ...S.btn, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Logging in…' : 'Login →'}
            </button>
          </>
        )}

        {/* ── Create Account Tab ── */}
        {tab === 'create' && (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>FULL NAME</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Dr. Your Name" style={S.input} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>EMAIL</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="faculty@college.edu" style={S.input} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>DEPARTMENT</label>
              <select value={dept} onChange={e => setDept(e.target.value)}
                style={{ ...S.input, appearance: 'none' }}>
                <option value="">Select Department</option>
                {['Computer Science','Electronics','Mechanical','Civil','Electrical','Mathematics','Physics','Chemistry','MBA','MCA'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={S.label}>PASSWORD</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" style={S.input} />
            </div>
            <button onClick={createAccount} disabled={loading} style={{ ...S.btn, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Creating…' : 'Create Account →'}
            </button>
          </>
        )}

        <p style={{ textAlign: 'center', fontSize: 12, color: '#475569', marginTop: 18 }}>
          HOD? <span onClick={() => router.push('/hod/login')} style={{ color: '#f59e0b', cursor: 'pointer', fontWeight: 600 }}>Go to HOD Portal →</span>
        </p>
      </div>
    </div>
  )
}
