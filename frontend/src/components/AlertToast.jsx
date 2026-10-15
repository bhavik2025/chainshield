import { useApp } from '../context/AppContext'
import { X, AlertTriangle, CheckCircle, Info, Zap } from 'lucide-react'

const TYPE_CONFIG = {
  danger:  { bg: '#fef2f2', border: '#fecaca', icon: AlertTriangle, iconColor: '#dc2626', titleColor: '#dc2626' },
  warning: { bg: '#fffbeb', border: '#fde68a', icon: AlertTriangle, iconColor: '#d97706', titleColor: '#d97706' },
  success: { bg: '#f0fdf4', border: '#bbf7d0', icon: CheckCircle,  iconColor: '#16a34a', titleColor: '#16a34a' },
  info:    { bg: '#eff6ff', border: '#bfdbfe', icon: Info,          iconColor: '#2563eb', titleColor: '#2563eb' },
}

export default function AlertToast() {
  const { toasts, removeToast, openAlertModal, disruptions } = useApp()
  if (!toasts.length) return null

  return (
    <div className="toast-stack">
      {toasts.map(toast => {
        const cfg = TYPE_CONFIG[toast.type] || TYPE_CONFIG.info
        const Icon = cfg.icon

        return (
          <div key={toast.id} style={{
            ...s.toast,
            background: cfg.bg,
            borderColor: cfg.border,
            animation: 'slideInRight 0.3s ease',
          }}>
            <div style={{ ...s.iconWrap, background: cfg.iconColor + '18' }}>
              <Icon size={16} color={cfg.iconColor} />
            </div>
            <div style={s.content}>
              <div style={{ ...s.title, color: cfg.titleColor }}>{toast.title}</div>
              <div style={s.message}>{toast.message}</div>
              {toast.disruptionId && (
                <button
                  style={{ ...s.viewBtn, color: cfg.titleColor, borderColor: cfg.border }}
                  onClick={() => {
                    const d = disruptions.find(d => d.id === toast.disruptionId)
                    if (d) openAlertModal(d)
                    removeToast(toast.id)
                  }}
                >
                  View Alert →
                </button>
              )}
            </div>
            <button style={s.closeBtn} onClick={() => removeToast(toast.id)}>
              <X size={14} color="#94a3b8" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

const s = {
  toast: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    padding: '12px 14px',
    borderRadius: 12, border: '1.5px solid',
    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
    minWidth: 300, maxWidth: 360,
    position: 'relative',
  },
  iconWrap: {
    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
  },
  content: { flex: 1, minWidth: 0 },
  title:   { fontSize: 13, fontWeight: 700, marginBottom: 2 },
  message: { fontSize: 12, color: '#475569', lineHeight: 1.4 },
  viewBtn: {
    marginTop: 6, display: 'inline-flex', alignItems: 'center',
    fontSize: 12, fontWeight: 600, background: 'none',
    border: 'none', cursor: 'pointer', padding: 0,
    textDecoration: 'underline', textUnderlineOffset: 2,
  },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    padding: 2, flexShrink: 0,
  },
}
