'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function Scanner() {
  const videoRef   = useRef(null)
  const canvasRef  = useRef(null)
  const [status, setStatus]   = useState('idle')
  const [message, setMessage] = useState('')
  const [scanning, setScanning] = useState(false)
  const router = useRouter()

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [])

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      if (videoRef.current) { videoRef.current.srcObject = stream; setScanning(true) }
    } catch (e) { setStatus('error'); setMessage('Camera access denied.') }
  }

  function stopCamera() {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop())
    }
  }

  useEffect(() => {
    if (!scanning) return
    let animId
    async function scan() {
      const jsQR = (await import('jsqr')).default
      const canvas = canvasRef.current; const video = videoRef.current
      if (!canvas || !video || video.readyState !== 4) { animId = requestAnimationFrame(scan); return }
      const ctx = canvas.getContext('2d')
      canvas.width = video.videoWidth; canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0)
      const img  = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(img.data, img.width, img.height)
      if (code) {
        setScanning(false); stopCamera()
        await submitScan(code.data)
      } else {
        animId = requestAnimationFrame(scan)
      }
    }
    animId = requestAnimationFrame(scan)
    return () => cancelAnimationFrame(animId)
  }, [scanning])

  async function submitScan(token) {
    setStatus('loading'); setMessage('Marking attendance…')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }
    const res  = await fetch('/api/attendance/scan', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ faculty_id: session.user.id, token })
    })
    const json = await res.json()
    if (json.success) {
      setStatus('success')
      setMessage(`✅ Attendance marked! ${json.status === 'late' ? '(Late)' : '(On time)'}`)
      setTimeout(() => router.replace('/dashboard'), 2000)
    } else {
      setStatus('error'); setMessage(json.message || 'Scan failed.')
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:'#07090f', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:20 }}>
      <button onClick={() => router.back()} style={{ position:'absolute', top:24, left:20, background:'none', border:'none', color:'#64748b', fontSize:22, cursor:'pointer' }}>←</button>
      <h1 style={{ fontSize:20, fontWeight:800, color:'#f1f5f9', marginBottom:8 }}>Scan QR Code</h1>
      <p style={{ fontSize:13, color:'#64748b', marginBottom:24 }}>Point camera at classroom QR</p>

      {status === 'idle' || scanning ? (
        <div style={{ width:'100%', maxWidth:340, borderRadius:24, overflow:'hidden', border:'2px solid #00d4aa', position:'relative' }}>
          <video ref={videoRef} autoPlay playsInline muted style={{ width:'100%', display:'block' }} />
          <canvas ref={canvasRef} style={{ display:'none' }} />
          <div style={{ position:'absolute', inset:0, border:'2px solid #00d4aa44', borderRadius:24, pointerEvents:'none' }}>
            <div style={{ position:'absolute', top:20, left:20, width:30, height:30, borderTop:'3px solid #00d4aa', borderLeft:'3px solid #00d4aa', borderRadius:'4px 0 0 0' }} />
            <div style={{ position:'absolute', top:20, right:20, width:30, height:30, borderTop:'3px solid #00d4aa', borderRight:'3px solid #00d4aa', borderRadius:'0 4px 0 0' }} />
            <div style={{ position:'absolute', bottom:20, left:20, width:30, height:30, borderBottom:'3px solid #00d4aa', borderLeft:'3px solid #00d4aa', borderRadius:'0 0 0 4px' }} />
            <div style={{ position:'absolute', bottom:20, right:20, width:30, height:30, borderBottom:'3px solid #00d4aa', borderRight:'3px solid #00d4aa', borderRadius:'0 0 4px 0' }} />
          </div>
        </div>
      ) : (
        <div style={{ textAlign:'center', padding:40 }}>
          <div style={{ fontSize:60, marginBottom:16 }}>{status==='success'?'✅':status==='loading'?'⏳':'❌'}</div>
          <p style={{ fontSize:16, color: status==='success'?'#00d4aa':status==='loading'?'#f59e0b':'#ef4444', fontWeight:600 }}>{message}</p>
          {status==='error' && (
            <button onClick={() => { setStatus('idle'); setMessage(''); startCamera(); setScanning(true) }}
              style={{ marginTop:20, padding:'12px 24px', borderRadius:12, border:'none', background:'#00d4aa', color:'#07090f', fontWeight:700, cursor:'pointer' }}>
              Try Again
            </button>
          )}
        </div>
      )}
      {scanning && <p style={{ fontSize:12, color:'#475569', marginTop:16 }}>Scanning…</p>}
    </div>
  )
}
