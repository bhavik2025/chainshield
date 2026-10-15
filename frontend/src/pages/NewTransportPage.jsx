import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { CITIES } from '../data/cities'
import { MODE_CONFIG } from '../data/mockData'
import Navbar from '../components/Navbar'
import { Package, MapPin, Calendar, Truck, User, DollarSign, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'

const REQUIRED = ['name','cargo','mode','originKey','destinationKey','departureDate','eta','carrier','operatorId','weight']

export default function NewTransportPage() {
  const navigate = useNavigate()
  const { createShipment, operators, baseCities, cargoTypes } = useApp()
  // Use admin-managed base cities if available, fall back to full CITIES list
  const activeCities = baseCities && baseCities.length > 0 ? baseCities : CITIES
  // Backend returns [{id, name}] objects; normalize to plain strings
  const activeCargoTypes = (cargoTypes && cargoTypes.length > 0)
    ? cargoTypes.map(c => (typeof c === 'string' ? c : c.name))
    : []
  const { currentUser } = useAuth()

  const [form, setForm] = useState({
    name: '', cargo: '', mode: '', originKey: '', destinationKey: '',
    departureDate: '', eta: '', carrier: '', operatorId: '',
    weight: '', value: '', description: '',
  })
  const [errors, setErrors]   = useState({})
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)
  const [created, setCreated] = useState(null)

  const set = (key, val) => {
    setForm(p => ({ ...p, [key]: val }))
    setErrors(p => ({ ...p, [key]: '' }))
  }

  const validate = () => {
    const errs = {}
    REQUIRED.forEach(k => { if (!form[k]) errs[k] = 'Required' })
    if (form.originKey && form.destinationKey && form.originKey === form.destinationKey)
      errs.destinationKey = 'Destination must differ from origin'
    if (form.departureDate && form.eta && form.eta < form.departureDate)
      errs.eta = 'Arrival must be after departure'
    return errs
  }

  const handleSubmit = async e => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    try {
      const origin      = activeCities.find(c => cityKey(c) === form.originKey)
      const destination = activeCities.find(c => cityKey(c) === form.destinationKey)

      const newShip = await createShipment({
        name: form.name.trim(),
        cargo: form.cargo,
        mode: form.mode,
        origin:      { city: origin.city,      country: origin.country,      lat: origin.lat,      lng: origin.lng },
        destination: { city: destination.city, country: destination.country, lat: destination.lat, lng: destination.lng },
        waypoints:   [
          { lat: origin.lat,      lng: origin.lng },
          { lat: destination.lat, lng: destination.lng },
        ],
        eta: form.eta,
        departureDate: form.departureDate,
        carrier: form.carrier.trim(),
        operatorId: form.operatorId,
        weight: form.weight.trim(),
        value: form.value ? Number(form.value) : 0,
        description: form.description.trim(),
      })
      setCreated(newShip)
      setDone(true)
    } catch (err) {
      setErrors({ _form: err.message })
    } finally {
      setLoading(false)
    }
  }

  const backPath = currentUser?.role === 'admin' ? '/admin' : '/manager'

  if (done && created) return <SuccessScreen shipment={created} onBack={() => navigate(backPath)} />

  return (
    <div style={s.root}>
      <Navbar />
      <div style={s.body}>
        <div style={s.container}>
          {/* Page header */}
          <div style={s.pageHeader}>
            <button style={s.backBtn} onClick={() => navigate(backPath)}>
              <ArrowLeft size={16} /> Back
            </button>
            <div>
              <h1 style={s.pageTitle}>Initiate New Transport</h1>
              <p style={s.pageSubtitle}>Fill in the shipment details to create and assign a new transport.</p>
            </div>
          </div>

          <form style={s.form} onSubmit={handleSubmit}>
            {/* ── Section 1: Basic Info ── */}
            <Section title="1. Shipment Information" icon={<Package size={16} color="#2563eb" />}>
              <Row>
                <Field label="Shipment Name *" error={errors.name}>
                  <input style={inp(errors.name)} value={form.name} onChange={e => set('name', e.target.value)} placeholder='e.g. "Electronics Batch Q2"' />
                </Field>
                <Field label="Cargo Type *" error={errors.cargo}>
                  <select style={inp(errors.cargo)} value={form.cargo} onChange={e => set('cargo', e.target.value)}>
                    <option value="">Select cargo type</option>
                    {activeCargoTypes.map(c => <option key={c}>{c}</option>)}
                  </select>
                </Field>
              </Row>
              <Row>
                <Field label="Transport Mode *" error={errors.mode}>
                  <div style={s.modeRow}>
                    {Object.entries(MODE_CONFIG).map(([k, v]) => (
                      <button key={k} type="button"
                        style={{ ...s.modeBtn, background: form.mode === k ? '#2563eb' : '#f1f5f9', color: form.mode === k ? '#fff' : '#475569', borderColor: form.mode === k ? '#2563eb' : '#e2e8f0' }}
                        onClick={() => set('mode', k)}
                      >
                        <span style={{ fontSize: 18 }}>{v.icon}</span>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{v.label}</span>
                      </button>
                    ))}
                  </div>
                  {errors.mode && <div style={s.errMsg}>{errors.mode}</div>}
                </Field>
              </Row>
              <Row>
                <Field label="Cargo Weight *" error={errors.weight}>
                  <input style={inp(errors.weight)} value={form.weight} onChange={e => set('weight', e.target.value)} placeholder='e.g. "240 tons"' />
                </Field>
                <Field label="Cargo Value (USD)" error={errors.value}>
                  <input style={inp(errors.value)} type="number" min="0" value={form.value} onChange={e => set('value', e.target.value)} placeholder="e.g. 4500000" />
                </Field>
              </Row>
              <Field label="Description (optional)">
                <textarea style={{ ...inp(), height: 72, resize: 'vertical' }} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief description of the cargo and any special handling requirements..." />
              </Field>
            </Section>

            {/* ── Section 2: Route ── */}
            <Section title="2. Route Details" icon={<MapPin size={16} color="#16a34a" />}>
              <Row>
                <Field label="Origin City *" error={errors.originKey}>
                  <select style={inp(errors.originKey)} value={form.originKey} onChange={e => set('originKey', e.target.value)}>
                    <option value="">Select origin city</option>
                    {activeCities.map(c => <option key={cityKey(c)} value={cityKey(c)}>{c.city}, {c.country}</option>)}
                  </select>
                </Field>
                <Field label="Destination City *" error={errors.destinationKey}>
                  <select style={inp(errors.destinationKey)} value={form.destinationKey} onChange={e => set('destinationKey', e.target.value)}>
                    <option value="">Select destination city</option>
                    {activeCities.map(c => <option key={cityKey(c)} value={cityKey(c)}>{c.city}, {c.country}</option>)}
                  </select>
                </Field>
              </Row>
              <Row>
                <Field label="Departure Date & Time *" error={errors.departureDate}>
                  <input style={inp(errors.departureDate)} type="datetime-local" value={form.departureDate} onChange={e => set('departureDate', e.target.value)} />
                </Field>
                <Field label="Expected Arrival Date *" error={errors.eta}>
                  <input style={inp(errors.eta)} type="date" value={form.eta} onChange={e => set('eta', e.target.value)} />
                </Field>
              </Row>
            </Section>

            {/* ── Section 3: Carrier & Operator ── */}
            <Section title="3. Carrier & Operator" icon={<Truck size={16} color="#d97706" />}>
              <Field label="Carrier / Transport Company *" error={errors.carrier}>
                <input style={inp(errors.carrier)} value={form.carrier} onChange={e => set('carrier', e.target.value)} placeholder='e.g. "Pacific Cargo Lines"' />
              </Field>
              <Field label="Assign Field Operator *" error={errors.operatorId}>
                {operators.length === 0 ? (
                  <div style={s.noOperators}>
                    <AlertCircle size={14} color="#d97706" />
                    No operators registered yet. Ask your operators to register and then assign them here.
                  </div>
                ) : (
                  <div style={s.operatorGrid}>
                    {operators.map(op => (
                      <div key={op.id}
                        style={{ ...s.opCard, borderColor: form.operatorId === op.id ? '#2563eb' : '#e2e8f0', background: form.operatorId === op.id ? '#eff6ff' : '#f8fafc' }}
                        onClick={() => set('operatorId', op.id)}
                      >
                        <div style={s.opAvatar}>{(op.name||'?').slice(0,2).toUpperCase()}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={s.opName}>{op.name}</div>
                          <div style={s.opMeta}>{op.operatorType} · {op.company}</div>
                          {op.shipmentId && <div style={s.opBusy}>⚠ Already assigned to {op.shipmentId}</div>}
                        </div>
                        {form.operatorId === op.id && <div style={s.checkDot} />}
                      </div>
                    ))}
                  </div>
                )}
                {errors.operatorId && <div style={s.errMsg}>{errors.operatorId}</div>}
              </Field>
            </Section>

            {/* Submit */}
            <div style={s.submitRow}>
              <button type="button" style={s.cancelBtn} onClick={() => navigate(backPath)}>Cancel</button>
              <button type="submit" style={s.submitBtn} disabled={loading}>
                {loading ? 'Creating Transport...' : '✓ Initiate Transport'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

/* ── Success screen ──────────────────────────────── */
function SuccessScreen({ shipment, onBack }) {
  const op = shipment.operatorId
  return (
    <div style={sc.root}>
      <div style={sc.card}>
        <div style={sc.iconWrap}><CheckCircle size={48} color="#16a34a" /></div>
        <h2 style={sc.title}>Transport Initiated!</h2>
        <p style={sc.sub}>Shipment <strong>{shipment.id}</strong> has been created and the field operator has been notified.</p>
        <div style={sc.detail}>
          <div style={sc.row}><span>Name</span><strong>{shipment.name}</strong></div>
          <div style={sc.row}><span>Route</span><strong>{shipment.origin?.city} → {shipment.destination?.city}</strong></div>
          <div style={sc.row}><span>Mode</span><strong>{shipment.mode?.toUpperCase()}</strong></div>
          <div style={sc.row}><span>ETA</span><strong>{shipment.eta}</strong></div>
        </div>
        <button style={sc.btn} onClick={onBack}>← Back to Dashboard</button>
      </div>
    </div>
  )
}

/* ── Helper sub-components ───────────────────────── */
function Section({ title, icon, children }) {
  return (
    <div style={s.section}>
      <div style={s.sectionTitle}>{icon}{title}</div>
      <div style={s.sectionBody}>{children}</div>
    </div>
  )
}
function Row({ children }) { return <div style={s.row}>{children}</div> }
function Field({ label, error, children }) {
  return (
    <div style={s.field}>
      <label style={s.fieldLabel}>{label}</label>
      {children}
      {error && <div style={s.errMsg}>{error}</div>}
    </div>
  )
}
const inp = err => ({
  width: '100%', padding: '9px 11px', borderRadius: 9, fontSize: 13,
  border: `1.5px solid ${err ? '#fca5a5' : '#e2e8f0'}`,
  background: err ? '#fef2f2' : '#f8fafc', color: '#0f172a',
  transition: 'border-color 0.15s',
})
const cityKey = c => `${c.city}__${c.country}`

const s = {
  root: { display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden',background:'#f1f5f9' },
  body: { flex:1,overflowY:'auto',padding:'20px 16px' },
  container: { maxWidth:820,margin:'0 auto',display:'flex',flexDirection:'column',gap:20 },
  pageHeader: { display:'flex',alignItems:'flex-start',gap:14 },
  backBtn: { display:'flex',alignItems:'center',gap:5,padding:'7px 12px',borderRadius:8,background:'#fff',border:'1px solid #e2e8f0',fontSize:13,fontWeight:600,color:'#475569',cursor:'pointer',whiteSpace:'nowrap',marginTop:4 },
  pageTitle: { fontSize:22,fontWeight:800,color:'#0f172a',letterSpacing:'-0.02em',marginBottom:4 },
  pageSubtitle: { fontSize:13,color:'#64748b' },
  form: { display:'flex',flexDirection:'column',gap:16 },
  section: { background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,0.05)' },
  sectionTitle: { display:'flex',alignItems:'center',gap:8,padding:'14px 18px',borderBottom:'1px solid #f1f5f9',fontSize:13,fontWeight:700,color:'#0f172a',background:'#fafbfc' },
  sectionBody: { padding:'18px',display:'flex',flexDirection:'column',gap:14 },
  row: { display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14 },
  field: { display:'flex',flexDirection:'column',gap:5 },
  fieldLabel: { fontSize:12,fontWeight:600,color:'#475569' },
  errMsg: { fontSize:11,color:'#dc2626',marginTop:3 },
  modeRow: { display:'flex',gap:8,flexWrap:'wrap' },
  modeBtn: { display:'flex',flexDirection:'column',alignItems:'center',gap:4,padding:'10px 16px',borderRadius:10,border:'1.5px solid',cursor:'pointer',transition:'all 0.15s',minWidth:72 },
  noOperators: { display:'flex',alignItems:'center',gap:7,fontSize:12,color:'#d97706',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:8,padding:'10px 12px' },
  operatorGrid: { display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:8 },
  opCard: { display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,border:'1.5px solid',cursor:'pointer',transition:'all 0.15s' },
  opAvatar: { width:34,height:34,borderRadius:'50%',background:'linear-gradient(135deg,#2563eb,#7c3aed)',color:'#fff',fontSize:11,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 },
  opName: { fontSize:13,fontWeight:600,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' },
  opMeta: { fontSize:11,color:'#64748b' },
  opBusy: { fontSize:10,color:'#d97706',marginTop:2 },
  checkDot: { width:8,height:8,borderRadius:'50%',background:'#2563eb',flexShrink:0 },
  submitRow: { display:'flex',gap:10,justifyContent:'flex-end',paddingBottom:24 },
  cancelBtn: { padding:'11px 24px',borderRadius:10,background:'#fff',border:'1.5px solid #e2e8f0',fontSize:14,fontWeight:600,color:'#475569',cursor:'pointer' },
  submitBtn: { padding:'11px 28px',borderRadius:10,background:'linear-gradient(135deg,#2563eb,#1d4ed8)',color:'#fff',border:'none',fontSize:14,fontWeight:700,cursor:'pointer',boxShadow:'0 4px 14px rgba(37,99,235,0.3)' },
}
const sc = {
  root: { minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f0fdf4',padding:20 },
  card: { background:'#fff',borderRadius:20,padding:'40px 36px',maxWidth:480,width:'100%',textAlign:'center',boxShadow:'0 8px 32px rgba(0,0,0,0.08)',border:'1px solid #bbf7d0' },
  iconWrap: { marginBottom:16 },
  title: { fontSize:24,fontWeight:800,color:'#0f172a',marginBottom:8 },
  sub: { fontSize:14,color:'#64748b',marginBottom:24,lineHeight:1.6 },
  detail: { background:'#f0fdf4',borderRadius:12,padding:'14px 18px',textAlign:'left',marginBottom:24,display:'flex',flexDirection:'column',gap:8 },
  row: { display:'flex',justifyContent:'space-between',fontSize:13,color:'#64748b' },
  btn: { padding:'12px 28px',borderRadius:10,background:'#16a34a',color:'#fff',border:'none',fontSize:14,fontWeight:700,cursor:'pointer' },
}
