import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Shield, Eye, EyeOff, User, Mail, Lock, Phone, Building, ChevronRight, AlertCircle, CheckCircle } from 'lucide-react'

export default function AuthPage() {
  const [mode, setMode]       = useState('login')
  const [registered, setRegistered] = useState(false)

  return (
    <div style={s.root}>
      <div style={s.bgBlob1} /><div style={s.bgBlob2} />
      <div style={s.card}>
        {/* Logo */}
        <div style={s.logo}>
          <div style={s.logoIcon}><Shield size={24} color="#fff" strokeWidth={2.5} /></div>
          <div>
            <div style={s.logoName}>ChainShield</div>
            <div style={s.logoSub}>Smart Supply Chain Protection</div>
          </div>
        </div>

        {/* Success banner after registration */}
        {registered && mode === 'login' && (
          <div style={s.successBanner}>
            <CheckCircle size={15} color="#16a34a" />
            Account created! Sign in with your new credentials.
          </div>
        )}

        {/* Tab toggle */}
        <div style={s.tabWrap}>
          <button style={{ ...s.tab, ...(mode === 'login'    ? s.tabActive : {}) }} onClick={() => setMode('login')}>Sign In</button>
          <button style={{ ...s.tab, ...(mode === 'register' ? s.tabActive : {}) }} onClick={() => setMode('register')}>Register</button>
        </div>

        {mode === 'login'    && <LoginForm />}
        {mode === 'register' && (
          <RegisterForm onSuccess={() => { setRegistered(true); setMode('login') }} />
        )}
      </div>
    </div>
  )
}

/* ── Login Form ─────────────────────────────────── */
function LoginForm() {
  const { login }    = useAuth()
  const navigate     = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Please fill in all fields.'); return }
    setLoading(true)
    try {
      const result = await login(email.trim(), password)
      if (result.error) { setError(result.error); return }
      const user = result.user
      if (user.role === 'admin')        navigate('/admin')
      else if (user.role === 'manager') navigate('/manager')
      else navigate(`/field/${user.id}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form style={s.form} onSubmit={handleSubmit}>
      <FormField icon={<Mail size={15} />} label="Email Address" type="email" value={email} onChange={setEmail} placeholder="you@company.com" />
      <div style={{ position: 'relative' }}>
        <FormField icon={<Lock size={15} />} label="Password" type={showPwd ? 'text' : 'password'} value={password} onChange={setPassword} placeholder="Your password" />
        <button type="button" style={s.eyeBtn} onClick={() => setShowPwd(p => !p)}>
          {showPwd ? <EyeOff size={15} color="#94a3b8" /> : <Eye size={15} color="#94a3b8" />}
        </button>
      </div>
      {error && <ErrorMsg msg={error} />}
      <button type="submit" style={s.submitBtn} disabled={loading}>
        {loading ? 'Signing in…' : <><span>Sign In</span><ChevronRight size={16} /></>}
      </button>
    </form>
  )
}

/* ── Register Form ──────────────────────────────── */
function RegisterForm({ onSuccess }) {
  const { register } = useAuth()
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    role: '', operatorType: '', phone: '', licenseId: '', company: '',
  })
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }))

  const validate = () => {
    if (!form.name.trim())    return 'Full name is required.'
    if (!form.email.trim())   return 'Email is required.'
    if (!/\S+@\S+\.\S+/.test(form.email)) return 'Enter a valid email address.'
    if (!form.password)       return 'Password is required.'
    if (form.password.length < 6) return 'Password must be at least 6 characters.'
    if (form.password !== form.confirmPassword) return 'Passwords do not match.'
    if (!form.role)           return 'Please select your role.'
    if (form.role === 'operator' && !form.operatorType) return 'Please select your operator type.'
    if (form.role === 'operator' && !form.phone.trim()) return 'Phone number is required for operators.'
    if (!form.company.trim()) return 'Company / organization name is required.'
    return null
  }

  const handleSubmit = async e => {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }
    setError(''); setLoading(true)
    try {
      const result = await register({
        name: form.name.trim(), email: form.email.trim(),
        password: form.password, role: form.role,
        operatorType: form.operatorType || null,
        phone: form.phone.trim() || null,
        licenseId: form.licenseId.trim() || null,
        company: form.company.trim(),
      })
      if (result.error) { setError(result.error); return }
      // Redirect to login page — user must sign in manually
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form style={s.form} onSubmit={handleSubmit}>
      <FormField icon={<User size={15} />}  label="Full Name *"           value={form.name}  onChange={v => set('name', v)}  placeholder="Your full name" />
      <FormField icon={<Mail size={15} />}  label="Email Address *"       value={form.email} onChange={v => set('email', v)} placeholder="you@company.com" type="email" />

      <div style={{ position: 'relative' }}>
        <FormField icon={<Lock size={15} />} label="Password * (min 6 chars)" value={form.password}
          onChange={v => set('password', v)} placeholder="Create a password" type={showPwd ? 'text' : 'password'} />
        <button type="button" style={s.eyeBtn} onClick={() => setShowPwd(p => !p)}>
          {showPwd ? <EyeOff size={15} color="#94a3b8" /> : <Eye size={15} color="#94a3b8" />}
        </button>
      </div>
      <FormField icon={<Lock size={15} />} label="Confirm Password *" value={form.confirmPassword}
        onChange={v => set('confirmPassword', v)} placeholder="Repeat your password" type="password" />

      {/* Role selector */}
      <div style={s.fieldWrap}>
        <label style={s.fieldLabel}>Your Role *</label>
        <div style={s.roleRow}>
          {[{ val: 'manager', label: '🖥 Manager' }, { val: 'operator', label: '🚛 Field Operator' }].map(r => (
            <button key={r.val} type="button"
              style={{ ...s.roleChip, background: form.role === r.val ? '#2563eb' : '#f1f5f9', color: form.role === r.val ? '#fff' : '#475569', borderColor: form.role === r.val ? '#2563eb' : '#e2e8f0' }}
              onClick={() => { set('role', r.val); if (r.val === 'manager') set('operatorType', '') }}
            >{r.label}</button>
          ))}
        </div>
      </div>

      {/* Operator sub-fields */}
      {form.role === 'operator' && (
        <>
          <div style={s.fieldWrap}>
            <label style={s.fieldLabel}>Operator Type *</label>
            <select style={s.select} value={form.operatorType} onChange={e => set('operatorType', e.target.value)}>
              <option value="">Select your role</option>
              <option>Captain</option><option>Pilot</option>
              <option>Driver</option><option>Loco Pilot</option>
            </select>
          </div>
          <FormField icon={<Phone size={15} />} label="Phone Number *" value={form.phone}
            onChange={v => set('phone', v)} placeholder="+1-800-555-0100" type="tel" />
          <FormField icon={<User size={15} />} label="License / Vehicle ID (optional)" value={form.licenseId}
            onChange={v => set('licenseId', v)} placeholder="LIC-XXXX or Vehicle No." />
        </>
      )}

      <FormField icon={<Building size={15} />} label="Company / Organization *" value={form.company}
        onChange={v => set('company', v)} placeholder="Your company name" />

      {error && <ErrorMsg msg={error} />}
      <button type="submit" style={s.submitBtn} disabled={loading}>
        {loading ? 'Creating account…' : <><span>Create Account</span><ChevronRight size={16} /></>}
      </button>
      <div style={s.hint}>After registration you will be asked to sign in.</div>
    </form>
  )
}

/* ── Shared sub-components ──────────────────────── */
function FormField({ icon, label, type = 'text', value, onChange, placeholder }) {
  return (
    <div style={s.fieldWrap}>
      <label style={s.fieldLabel}>{label}</label>
      <div style={s.inputWrap}>
        <span style={s.inputIcon}>{icon}</span>
        <input style={s.input} type={type} value={value} placeholder={placeholder}
          onChange={e => onChange(e.target.value)} />
      </div>
    </div>
  )
}

function ErrorMsg({ msg }) {
  return (
    <div style={s.error}>
      <AlertCircle size={14} color="#dc2626" />{msg}
    </div>
  )
}

/* ── Styles ─────────────────────────────────────── */
const s = {
  root: { minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,#eff6ff 0%,#f8fafc 50%,#f0fdf4 100%)',padding:'20px 16px',position:'relative',overflow:'hidden' },
  bgBlob1: { position:'absolute',top:'-100px',right:'-100px',width:'400px',height:'400px',borderRadius:'50%',background:'radial-gradient(circle,rgba(37,99,235,0.08) 0%,transparent 70%)',pointerEvents:'none' },
  bgBlob2: { position:'absolute',bottom:'-80px',left:'-80px',width:'320px',height:'320px',borderRadius:'50%',background:'radial-gradient(circle,rgba(22,163,74,0.07) 0%,transparent 70%)',pointerEvents:'none' },
  card: { background:'#fff',borderRadius:20,padding:'32px 28px',width:'100%',maxWidth:460,boxShadow:'0 8px 32px rgba(0,0,0,0.08)',border:'1px solid #e2e8f0',position:'relative' },
  logo: { display:'flex',alignItems:'center',gap:12,marginBottom:24 },
  logoIcon: { width:44,height:44,borderRadius:12,background:'linear-gradient(135deg,#2563eb,#1d4ed8)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 6px 16px rgba(37,99,235,0.28)',flexShrink:0 },
  logoName: { fontSize:20,fontWeight:800,color:'#0f172a',letterSpacing:'-0.02em' },
  logoSub:  { fontSize:11,color:'#64748b' },
  successBanner: { display:'flex',alignItems:'center',gap:8,background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 14px',fontSize:13,color:'#16a34a',fontWeight:500,marginBottom:14 },
  tabWrap:  { display:'flex',background:'#f1f5f9',borderRadius:10,padding:3,marginBottom:22,gap:3 },
  tab:      { flex:1,padding:'8px',borderRadius:8,border:'none',fontSize:13,fontWeight:600,cursor:'pointer',background:'transparent',color:'#64748b',transition:'all 0.15s' },
  tabActive:{ background:'#fff',color:'#2563eb',boxShadow:'0 1px 4px rgba(0,0,0,0.08)' },
  form:     { display:'flex',flexDirection:'column',gap:14 },
  fieldWrap:{ display:'flex',flexDirection:'column',gap:5 },
  fieldLabel:{ fontSize:12,fontWeight:600,color:'#475569' },
  inputWrap: { position:'relative',display:'flex',alignItems:'center' },
  inputIcon: { position:'absolute',left:11,color:'#94a3b8',display:'flex',alignItems:'center',pointerEvents:'none' },
  input: { width:'100%',padding:'9px 10px 9px 34px',border:'1.5px solid #e2e8f0',borderRadius:9,fontSize:13,color:'#0f172a',background:'#f8fafc',transition:'border-color 0.15s',boxSizing:'border-box' },
  eyeBtn: { position:'absolute',right:10,background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',padding:2 },
  select: { padding:'9px 10px',border:'1.5px solid #e2e8f0',borderRadius:9,fontSize:13,color:'#0f172a',background:'#f8fafc',width:'100%' },
  roleRow: { display:'flex',gap:8 },
  roleChip: { flex:1,padding:'9px 8px',borderRadius:9,border:'1.5px solid',fontSize:13,fontWeight:600,cursor:'pointer',transition:'all 0.15s' },
  error: { display:'flex',alignItems:'center',gap:6,fontSize:12,color:'#dc2626',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'8px 10px' },
  submitBtn: { display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'12px',borderRadius:10,background:'linear-gradient(135deg,#2563eb,#1d4ed8)',color:'#fff',fontSize:14,fontWeight:700,border:'none',cursor:'pointer',boxShadow:'0 4px 14px rgba(37,99,235,0.3)',transition:'opacity 0.15s',marginTop:4 },
  hint: { textAlign:'center',fontSize:11,color:'#94a3b8' },
}
