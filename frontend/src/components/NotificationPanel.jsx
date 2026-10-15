import { useApp } from '../context/AppContext'
import { Bell, CheckCircle, Clock, DollarSign, TrendingDown, X } from 'lucide-react'

export default function NotificationPanel({ userId }) {
  const { getMyNotifications, readNotification, notifications } = useApp()
  const myNotifs = getMyNotifications(userId)

  if (!myNotifs.length) return null

  const unread = myNotifs.filter(n => !n.read).length

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <Bell size={14} color={unread > 0 ? '#dc2626' : '#64748b'} />
        <span style={s.title}>Notifications from Manager</span>
        {unread > 0 && <span style={s.badge}>{unread} new</span>}
      </div>

      <div style={s.list}>
        {myNotifs.map(notif => (
          <NotifCard key={notif.id} notif={notif} onRead={() => readNotification(notif.id)} />
        ))}
      </div>
    </div>
  )
}

function NotifCard({ notif, onRead }) {
  const sol = notif.solution

  return (
    <div style={{ ...s.card, borderLeft: notif.read ? '3px solid #e2e8f0' : '3px solid #2563eb', background: notif.read ? '#f8fafc' : '#eff6ff' }}>
      {/* Header */}
      <div style={s.cardTop}>
        <div style={{ ...s.iconWrap, background: notif.read ? '#f1f5f9' : '#dbeafe' }}>
          <Bell size={14} color={notif.read ? '#94a3b8' : '#2563eb'} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...s.notifTitle, color: notif.read ? '#475569' : '#0f172a' }}>{notif.title}</div>
          <div style={s.disruptionName}>{notif.disruptionTitle}</div>
        </div>
        {!notif.read && (
          <button style={s.readBtn} onClick={onRead} title="Mark as read">
            <X size={12} />
          </button>
        )}
      </div>

      {/* Solution details */}
      {sol && (
        <div style={s.solBox}>
          <div style={s.solTitle}>✅ Selected Solution: {sol.title}</div>
          <div style={s.solDesc}>{sol.description}</div>
          <div style={s.solMetrics}>
            <SolMetric icon={<Clock size={11} />}       label="Extra Time"  value={sol.extraTimeHours > 0 ? `+${sol.extraTimeHours}h` : 'None'} />
            <SolMetric icon={<DollarSign size={11} />}  label="Extra Cost"  value={`+$${sol.extraCostUSD?.toLocaleString()}`} />
            <SolMetric icon={<TrendingDown size={11} />} label="Risk Score"  value={`${sol.riskScore}/100`} />
          </div>
          <div style={s.actionNote}>
            Please follow the updated route instructions from your operations manager.
          </div>
        </div>
      )}

      <div style={s.time}>{new Date(notif.createdAt).toLocaleString()}</div>
    </div>
  )
}

function SolMetric({ icon, label, value }) {
  return (
    <div style={s.metric}>
      <span style={{ color: '#64748b' }}>{icon}</span>
      <span style={s.metricLabel}>{label}:</span>
      <span style={s.metricValue}>{value}</span>
    </div>
  )
}

const s = {
  wrap: { background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  header: { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderBottom: '1px solid #f1f5f9', background: '#fafbfc' },
  title: { fontSize: 12, fontWeight: 700, color: '#475569', flex: 1 },
  badge: { background: '#dc2626', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 },
  list: { display: 'flex', flexDirection: 'column' },
  card: { padding: '12px 14px', borderBottom: '1px solid #f1f5f9' },
  cardTop: { display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  iconWrap: { width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  notifTitle: { fontSize: 13, fontWeight: 700, marginBottom: 2 },
  disruptionName: { fontSize: 11, color: '#dc2626' },
  readBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2 },
  solBox: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 },
  solTitle: { fontSize: 12, fontWeight: 700, color: '#16a34a' },
  solDesc:  { fontSize: 11, color: '#475569', lineHeight: 1.45 },
  solMetrics: { display: 'flex', gap: 14, flexWrap: 'wrap' },
  metric: { display: 'flex', alignItems: 'center', gap: 3, fontSize: 11 },
  metricLabel: { color: '#64748b' },
  metricValue: { fontWeight: 600, color: '#0f172a' },
  actionNote: { fontSize: 11, color: '#16a34a', fontStyle: 'italic' },
  time: { fontSize: 10, color: '#94a3b8', marginTop: 6 },
}
