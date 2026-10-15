import { useState } from 'react'
import { useApp }  from '../context/AppContext'
import {
  CheckCircle2, AlertTriangle, Clock, TrendingDown,
  Lock, Truck, Package, MapPin, Star, ChevronRight,
  FileText, ArrowRight, PartyPopper,
} from 'lucide-react'

/* ── Status definitions ──────────────────────────────────────────────── */
const STATUS_DEF = {
  on_time:   { label: 'On Time',   color: '#16a34a', bg: '#f0fdf4', border: '#86efac', icon: CheckCircle2 },
  at_risk:   { label: 'At Risk',   color: '#d97706', bg: '#fffbeb', border: '#fcd34d', icon: AlertTriangle },
  delayed:   { label: 'Delayed',   color: '#ea580c', bg: '#fff7ed', border: '#fdba74', icon: TrendingDown  },
  disrupted: { label: 'Disrupted', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', icon: AlertTriangle },
  delivered: { label: 'Delivered', color: '#16a34a', bg: '#f0fdf4', border: '#86efac', icon: CheckCircle2 },
}

/* ── Transition options ──────────────────────────────────────────────── */
const TRANSITIONS = {
  on_time:  [
    { to: 'at_risk',   label: 'Flag At Risk',     desc: 'Potential issue detected on route',     emoji: '⚠️', color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
    { to: 'delayed',   label: 'Report Delay',      desc: 'Shipment is running behind schedule',   emoji: '⏱️', color: '#ea580c', bg: '#fff7ed', border: '#fdba74' },
    { to: 'delivered', label: 'Confirm Delivery',  desc: 'Goods successfully delivered',          emoji: '🎉', color: '#16a34a', bg: '#f0fdf4', border: '#86efac', highlight: true },
  ],
  at_risk:  [
    { to: 'on_time',   label: 'Back on Track',     desc: 'Issue resolved, route is clear',        emoji: '✅', color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
    { to: 'delayed',   label: 'Report Delay',       desc: 'Shipment is running behind schedule',  emoji: '⏱️', color: '#ea580c', bg: '#fff7ed', border: '#fdba74' },
    { to: 'delivered', label: 'Confirm Delivery',   desc: 'Goods successfully delivered',         emoji: '🎉', color: '#16a34a', bg: '#f0fdf4', border: '#86efac', highlight: true },
  ],
  delayed:  [
    { to: 'on_time',   label: 'Back on Track',      desc: 'Delay resolved, back to schedule',    emoji: '✅', color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
    { to: 'at_risk',   label: 'Flag At Risk',        desc: 'Ongoing risk but not yet delayed',    emoji: '⚠️', color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
    { to: 'delivered', label: 'Confirm Delivery',    desc: 'Goods successfully delivered',        emoji: '🎉', color: '#16a34a', bg: '#f0fdf4', border: '#86efac', highlight: true },
  ],
  disrupted: [],
  delivered: [],
}

/* ── Journey steps for progress bar ─────────────────────────────────── */
const JOURNEY = ['on_time', 'at_risk', 'delayed', 'delivered']

export default function StatusUpdatePanel({ ship }) {
  const { updateShipmentStatus } = useApp()
  const [selected,  setSelected]  = useState(null)   // transition option
  const [note,      setNote]      = useState('')
  const [loading,   setLoading]   = useState(false)
  const [confirmed, setConfirmed] = useState(false)   // delivery success screen

  const status     = ship.status
  const def        = STATUS_DEF[status]   || STATUS_DEF.on_time
  const Icon       = def.icon
  const transitions = TRANSITIONS[status] || []

  /* ── Delivered — terminal success screen ───────────────────────── */
  if (status === 'delivered' || confirmed) {
    return <DeliveredScreen ship={ship} />
  }

  /* ── Disrupted — manager must resolve ──────────────────────────── */
  if (status === 'disrupted') {
    return (
      <div style={s.card}>
        <div style={{ ...s.statusHeader, borderColor: '#fca5a5', background: '#fef2f2' }}>
          <div style={{ ...s.statusDot, background: '#dc2626' }} />
          <span style={{ ...s.statusLabel, color: '#dc2626' }}>Route Disrupted</span>
          <Lock size={14} color="#dc2626" />
        </div>
        <div style={s.lockedBody}>
          <div style={s.lockedIcon}><Lock size={28} color="#dc2626" /></div>
          <div style={s.lockedTitle}>Status Locked by System</div>
          <div style={s.lockedDesc}>
            An active disruption is blocking this shipment. Your operations manager
            is reviewing the situation and will select a resolution. You will be
            notified as soon as action is taken.
          </div>
          <div style={s.lockedTag}>Awaiting Manager Decision</div>
        </div>
      </div>
    )
  }

  /* ── Confirmation overlay ───────────────────────────────────────── */
  if (selected) {
    const isDelivery = selected.to === 'delivered'
    return (
      <div style={s.card}>
        {/* Back header */}
        <button style={s.backBtn} onClick={() => { setSelected(null); setNote('') }}>
          ← Back to Status
        </button>

        {/* Confirmation card */}
        <div style={{ ...s.confirmBox, borderColor: selected.border, background: selected.bg }}>
          <div style={s.confirmEmoji}>{selected.emoji}</div>
          <div style={{ ...s.confirmTitle, color: selected.color }}>{selected.label}</div>
          <div style={s.confirmSubtitle}>{selected.desc}</div>
        </div>

        {/* Transition arrow */}
        <div style={s.transArrow}>
          <span style={{ ...s.statusPill, background: def.bg, color: def.color, border: `1px solid ${def.border}` }}>
            {def.label}
          </span>
          <ArrowRight size={16} color="#94a3b8" />
          <span style={{ ...s.statusPill, background: selected.bg, color: selected.color, border: `1px solid ${selected.border}` }}>
            {STATUS_DEF[selected.to]?.label || selected.label}
          </span>
        </div>

        {/* Note field */}
        <div style={s.noteWrap}>
          <div style={s.noteLabel}>
            <FileText size={13} color="#64748b" /> Add a note (optional)
          </div>
          <textarea
            style={s.noteInput}
            placeholder={isDelivery
              ? 'e.g. Delivered to warehouse dock 3, signed by John. All goods intact.'
              : 'e.g. Traffic congestion on highway A4, estimate +2h delay.'}
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
          />
        </div>

        {/* Confirm button */}
        <button
          style={{ ...s.confirmBtn, background: isDelivery
            ? 'linear-gradient(135deg, #16a34a 0%, #059669 100%)'
            : selected.color,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
          disabled={loading}
          onClick={async () => {
            setLoading(true)
            try {
              await updateShipmentStatus(ship.id, selected.to, note)
              if (selected.to === 'delivered') setConfirmed(true)
              else { setSelected(null); setNote('') }
            } catch (_) {}
            finally { setLoading(false) }
          }}
        >
          {loading
            ? 'Updating…'
            : isDelivery
              ? '🎉 Confirm Delivery'
              : `Confirm — ${selected.label}`}
        </button>
      </div>
    )
  }

  /* ── Main panel ─────────────────────────────────────────────────── */
  return (
    <div style={s.card}>
      {/* Current status header */}
      <div style={{ ...s.statusHeader, borderColor: def.border, background: def.bg }}>
        <div style={{ ...s.statusDot, background: def.color }} />
        <Icon size={15} color={def.color} />
        <span style={{ ...s.statusLabel, color: def.color }}>
          Current Status: <strong>{def.label}</strong>
        </span>
      </div>

      {/* Journey progress bar */}
      <JourneyBar current={status} />

      {/* Shipment info row */}
      <div style={s.infoRow}>
        <div style={s.infoItem}><Truck size={13} color="#64748b" /> {ship.mode?.toUpperCase() || 'SEA'}</div>
        <div style={s.infoItem}><MapPin size={13} color="#64748b" /> {ship.originCity || '—'} → {ship.destCity || '—'}</div>
        <div style={s.infoItem}><Package size={13} color="#64748b" /> {ship.cargo || 'General'}</div>
      </div>

      {/* Divider */}
      <div style={s.divider} />

      {/* Actions label */}
      <div style={s.actionsLabel}>Update Status</div>

      {/* Transition options */}
      {transitions.length === 0 ? (
        <div style={s.noTransitions}>No status changes available.</div>
      ) : (
        <div style={s.transitionsGrid}>
          {transitions.map(t => (
            <TransitionCard key={t.to} option={t} onClick={() => setSelected(t)} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Journey progress bar ──────────────────────────────────────────── */
function JourneyBar({ current }) {
  const steps = [
    { key: 'on_time',  label: 'On Time',  icon: '🟢' },
    { key: 'at_risk',  label: 'At Risk',  icon: '🟡' },
    { key: 'delayed',  label: 'Delayed',  icon: '🟠' },
    { key: 'delivered',label: 'Done',     icon: '✅' },
  ]
  const curIdx = steps.findIndex(s => s.key === current)

  return (
    <div style={j.wrap}>
      {steps.map((step, idx) => {
        const isPast    = idx < curIdx
        const isCurrent = idx === curIdx
        const isFuture  = idx > curIdx

        return (
          <div key={step.key} style={j.stepWrap}>
            {/* connector line */}
            {idx > 0 && (
              <div style={{ ...j.line, background: isPast || isCurrent ? '#3b82f6' : '#e2e8f0' }} />
            )}
            <div style={{
              ...j.dot,
              background:   isCurrent ? '#2563eb' : isPast ? '#3b82f6' : '#e2e8f0',
              borderColor:  isCurrent ? '#2563eb' : isPast ? '#3b82f6' : '#cbd5e1',
              transform:    isCurrent ? 'scale(1.25)' : 'scale(1)',
              boxShadow:    isCurrent ? '0 0 0 3px rgba(37,99,235,0.2)' : 'none',
            }}>
              {isPast && <span style={{ fontSize: 8 }}>✓</span>}
              {isCurrent && <span style={{ fontSize: 7, color: '#fff', fontWeight: 800 }}>●</span>}
            </div>
            <div style={{ ...j.stepLabel, color: isCurrent ? '#2563eb' : isPast ? '#475569' : '#94a3b8', fontWeight: isCurrent ? 700 : 400 }}>
              {step.label}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Transition card ───────────────────────────────────────────────── */
function TransitionCard({ option, onClick }) {
  const [hover, setHover] = useState(false)

  if (option.highlight) {
    // Delivery — special full-width green card
    return (
      <button
        style={{
          ...t.deliveryBtn,
          transform: hover ? 'translateY(-1px)' : 'none',
          boxShadow: hover ? '0 6px 20px rgba(22,163,74,0.35)' : '0 2px 8px rgba(22,163,74,0.2)',
        }}
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <PartyPopper size={20} color="#fff" />
        <div style={t.deliveryTextWrap}>
          <div style={t.deliveryTitle}>{option.label}</div>
          <div style={t.deliveryDesc}>{option.desc}</div>
        </div>
        <ChevronRight size={18} color="rgba(255,255,255,0.8)" />
      </button>
    )
  }

  return (
    <button
      style={{
        ...t.card,
        borderColor: hover ? option.color : option.border,
        background:  hover ? option.bg : '#fff',
        transform:   hover ? 'translateY(-1px)' : 'none',
        boxShadow:   hover ? `0 4px 12px ${option.color}22` : '0 1px 3px rgba(0,0,0,0.06)',
      }}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div style={t.emoji}>{option.emoji}</div>
      <div style={t.textWrap}>
        <div style={{ ...t.label, color: option.color }}>{option.label}</div>
        <div style={t.desc}>{option.desc}</div>
      </div>
      <ChevronRight size={14} color={option.color} />
    </button>
  )
}

/* ── Delivered success screen ──────────────────────────────────────── */
function DeliveredScreen({ ship }) {
  return (
    <div style={d.wrap}>
      <div style={d.circle}>
        <CheckCircle2 size={48} color="#16a34a" strokeWidth={1.5} />
      </div>
      <div style={d.title}>Delivery Completed! 🎉</div>
      <div style={d.sub}>
        <strong>{ship.name}</strong> has been successfully delivered to{' '}
        <strong>{ship.destCity || 'destination'}</strong>.
        Your operations manager has been notified.
      </div>
      <div style={d.infoGrid}>
        <InfoChip label="Shipment ID" value={ship.id} />
        <InfoChip label="Cargo" value={ship.cargo || 'General'} />
        <InfoChip label="Origin" value={ship.originCity || '—'} />
        <InfoChip label="Destination" value={ship.destCity || '—'} />
      </div>
      <div style={d.badge}>
        <Star size={12} color="#d97706" fill="#d97706" />
        Mission Accomplished
        <Star size={12} color="#d97706" fill="#d97706" />
      </div>
    </div>
  )
}

function InfoChip({ label, value }) {
  return (
    <div style={d.chip}>
      <div style={d.chipLabel}>{label}</div>
      <div style={d.chipValue}>{value}</div>
    </div>
  )
}

/* ── Styles ─────────────────────────────────────────────────────────── */
const s = {
  card: { display: 'flex', flexDirection: 'column', gap: 14, padding: '18px 16px', background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0' },
  statusHeader: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, border: '1px solid', fontSize: 13 },
  statusDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  statusLabel: { fontWeight: 600, fontSize: 13 },
  statusPill: { padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  infoRow: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  infoItem: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#64748b', background: '#f8fafc', padding: '4px 10px', borderRadius: 20, border: '1px solid #e2e8f0' },
  divider: { height: 1, background: '#f1f5f9' },
  actionsLabel: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' },
  transitionsGrid: { display: 'flex', flexDirection: 'column', gap: 8 },
  noTransitions: { fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '12px 0' },
  // Locked state
  lockedBody: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '20px 12px', textAlign: 'center' },
  lockedIcon: { background: '#fef2f2', padding: 14, borderRadius: '50%' },
  lockedTitle: { fontSize: 15, fontWeight: 700, color: '#dc2626' },
  lockedDesc: { fontSize: 13, color: '#64748b', lineHeight: 1.6, maxWidth: 320 },
  lockedTag: { fontSize: 11, fontWeight: 700, color: '#dc2626', background: '#fef2f2', border: '1px solid #fca5a5', padding: '4px 12px', borderRadius: 20 },
  // Confirmation
  backBtn: { background: 'none', border: 'none', color: '#64748b', fontSize: 13, cursor: 'pointer', padding: '0 0 4px 0', textAlign: 'left' },
  confirmBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '20px 16px', borderRadius: 12, border: '2px solid' },
  confirmEmoji: { fontSize: 32 },
  confirmTitle: { fontSize: 18, fontWeight: 700 },
  confirmSubtitle: { fontSize: 13, color: '#64748b', textAlign: 'center' },
  transArrow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 },
  noteWrap: { display: 'flex', flexDirection: 'column', gap: 6 },
  noteLabel: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#64748b', fontWeight: 600 },
  noteInput: { border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#1e293b', resize: 'vertical', fontFamily: 'inherit', outline: 'none', lineHeight: 1.5 },
  confirmBtn: { color: '#fff', border: 'none', borderRadius: 10, padding: '13px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all .15s', letterSpacing: '0.01em' },
}

const j = {
  wrap: { display: 'flex', alignItems: 'flex-start', gap: 0, padding: '6px 8px' },
  stepWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative' },
  line: { position: 'absolute', top: 9, right: '50%', width: '100%', height: 2, transition: 'background .3s' },
  dot: { width: 18, height: 18, borderRadius: '50%', border: '2px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, zIndex: 1, transition: 'all .2s' },
  stepLabel: { fontSize: 10, marginTop: 5, textAlign: 'center', transition: 'color .2s', fontWeight: 400 },
}

const t = {
  card: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, border: '1.5px solid', background: '#fff', cursor: 'pointer', transition: 'all .15s', textAlign: 'left', width: '100%' },
  emoji: { fontSize: 20, flexShrink: 0 },
  textWrap: { flex: 1 },
  label: { fontSize: 14, fontWeight: 700 },
  desc: { fontSize: 12, color: '#64748b', marginTop: 2 },
  deliveryBtn: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12, background: 'linear-gradient(135deg, #16a34a 0%, #059669 100%)', border: 'none', cursor: 'pointer', transition: 'all .15s', width: '100%', marginTop: 4 },
  deliveryTextWrap: { flex: 1, textAlign: 'left' },
  deliveryTitle: { fontSize: 15, fontWeight: 800, color: '#fff' },
  deliveryDesc: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
}

const d = {
  wrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '24px 16px', background: '#f0fdf4', borderRadius: 14, border: '1.5px solid #86efac', textAlign: 'center' },
  circle: { background: '#dcfce7', borderRadius: '50%', padding: 20, border: '2px solid #86efac' },
  title: { fontSize: 20, fontWeight: 800, color: '#15803d' },
  sub: { fontSize: 13, color: '#166534', lineHeight: 1.6, maxWidth: 300 },
  infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%' },
  chip: { background: '#fff', borderRadius: 8, padding: '8px 12px', border: '1px solid #bbf7d0', textAlign: 'left' },
  chipLabel: { fontSize: 10, color: '#86efac', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 },
  chipValue: { fontSize: 12, color: '#15803d', fontWeight: 600, wordBreak: 'break-all' },
  badge: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#d97706', background: '#fefce8', border: '1px solid #fde68a', padding: '5px 14px', borderRadius: 20 },
}
