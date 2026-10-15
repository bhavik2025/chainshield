import { useApp } from '../context/AppContext'
import { Package, CheckCircle, AlertTriangle, Zap, Activity, DollarSign, Truck } from 'lucide-react'

const fmt = n => n >= 1_000_000 ? `$${(n/1_000_000).toFixed(1)}M` : `$${(n/1000).toFixed(0)}K`

// compact = true  → 3-column tight grid (used on mobile/tablet)
// compact = false → 6-column full grid (used on desktop)
export default function KPICards({ compact = false }) {
  const { shipments, disruptions } = useApp()

  const total     = shipments.length
  const onTime    = shipments.filter(s => s.status === 'on_time').length
  const atRisk    = shipments.filter(s => s.status === 'at_risk' || s.status === 'delayed').length
  const disrupted = shipments.filter(s => s.status === 'disrupted').length
  const delivered = shipments.filter(s => s.status === 'delivered').length
  const valueAtRisk = shipments
    .filter(s => !['on_time', 'delivered'].includes(s.status))
    .reduce((sum, s) => sum + (s.value || 0), 0)

  const cards = [
    { label: compact ? 'Total'     : 'Total Shipments', value: total,             icon: Package,       color: '#2563eb', bg: '#eff6ff' },
    { label: 'On Time',                                  value: onTime,            icon: CheckCircle,   color: '#16a34a', bg: '#f0fdf4' },
    { label: 'At Risk',                                  value: atRisk,            icon: AlertTriangle, color: '#d97706', bg: '#fffbeb' },
    { label: 'Disrupted',                                value: disrupted,         icon: Zap,           color: '#dc2626', bg: '#fef2f2' },
    { label: compact ? 'Delivered' : 'Delivered',        value: delivered,         icon: Truck,         color: '#0891b2', bg: '#ecfeff' },
    { label: compact ? 'Value@Risk': 'Value at Risk',   value: fmt(valueAtRisk),  icon: DollarSign,    color: '#ea580c', bg: '#fff7ed' },
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: compact ? 'repeat(3,1fr)' : 'repeat(6,1fr)',
      gap: compact ? 7 : 10,
    }}>
      {cards.map(c => (
        <div key={c.label} style={{
          borderRadius: 12,
          padding: compact ? '10px 10px 8px' : '14px 14px 12px',
          background: c.bg,
          display: 'flex', flexDirection: 'column', gap: 4,
          border: '1px solid rgba(0,0,0,0.05)',
        }}>
          <div style={{
            width: compact ? 28 : 36, height: compact ? 28 : 36,
            borderRadius: 9, background: c.color + '18',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 2,
          }}>
            <c.icon size={compact ? 14 : 18} color={c.color} strokeWidth={2} />
          </div>
          <div style={{ fontSize: compact ? 18 : 24, fontWeight: 800, lineHeight: 1, color: c.color }}>
            {c.value}
          </div>
          <div style={{ fontSize: compact ? 10 : 11, color: '#64748b', fontWeight: 500, lineHeight: 1.3 }}>
            {c.label}
          </div>
        </div>
      ))}
    </div>
  )
}
