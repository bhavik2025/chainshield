import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp }  from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { Shield, Bell, LogOut, Zap, Menu, X, MessageSquare, Plus } from 'lucide-react'
import ChatModal from './ChatModal'

export default function Navbar({ onMenuToggle, menuOpen }) {
  const navigate = useNavigate()
  const { disruptions, triggerDemo } = useApp()
  const { currentUser, logout } = useAuth()
  const [chatOpen, setChatOpen] = useState(false)

  const criticalCount = disruptions.filter(d => d.severity === 'critical').length
  const totalAlerts   = disruptions.length

  // Build initials from name for avatar
  const initials = currentUser?.name
    ? currentUser.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'CS'

  const handleLogout = () => { logout(); navigate('/') }

  return (
    <>
    <nav style={s.nav}>
      {/* Left: hamburger + logo */}
      <div style={s.left}>
        {onMenuToggle && (
          <button style={s.menuBtn} onClick={onMenuToggle}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        )}
        <div style={s.logo}>
          <div style={s.logoIcon}><Shield size={16} color="#fff" strokeWidth={2.5} /></div>
          <span style={s.logoText}>ChainShield</span>
        </div>
        {currentUser?.role === 'manager' && (
          <span style={s.roleChip}>Manager View</span>
        )}
        {currentUser?.role === 'operator' && (
          <span style={{ ...s.roleChip, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
            {currentUser.operatorType || 'Field Operator'}
          </span>
        )}
      </div>

      {/* Right: actions */}
      <div style={s.right}>
        {/* New Transport — manager + admin */}
        {(currentUser?.role === 'manager' || currentUser?.role === 'admin') && (
          <button style={s.newTransportBtn} onClick={() => navigate('/manager/new-transport')} title="Create new transport">
            <Plus size={14} />
            New Transport
          </button>
        )}

        {/* Demo trigger — manager only */}
        {currentUser?.role === 'manager' && (
          <button style={s.demoBtn} onClick={triggerDemo} title="Simulate a disruption for demo">
            <Zap size={14} />
            Simulate Alert
          </button>
        )}

        {/* Chat button */}
        <button style={s.chatBtn} onClick={() => setChatOpen(true)} title="Direct Messages">
          <MessageSquare size={16} />
        </button>

        {/* Notification bell (disruption count) */}
        <div style={s.bellWrap}>
          <Bell size={18} color={totalAlerts > 0 ? '#dc2626' : '#64748b'} />
          {totalAlerts > 0 && (
            <span style={{ ...s.bellBadge, background: criticalCount > 0 ? '#dc2626' : '#d97706' }}>
              {totalAlerts}
            </span>
          )}
        </div>

        {/* User name + avatar */}
        <div style={s.userInfo}>
          <div style={s.userAvatar}>{initials}</div>
          <div style={s.userName}>{currentUser?.name?.split(' ')[0] || 'User'}</div>
        </div>

        {/* Logout */}
        <button style={s.logoutBtn} onClick={handleLogout} title="Logout">
          <LogOut size={16} />
        </button>
      </div>
    </nav>

    {chatOpen && <ChatModal onClose={() => setChatOpen(false)} />}
  </>
  )
}

const s = {
  nav: {
    height: 'var(--navbar-h)',
    background: '#fff',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    flexShrink: 0,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  left: { display: 'flex', alignItems: 'center', gap: 12 },
  menuBtn: {
    display: 'none',
    background: 'none',
    border: 'none',
    padding: 6,
    borderRadius: 6,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    '@media(max-width:768px)': { display: 'flex' },
  },
  logo: { display: 'flex', alignItems: 'center', gap: 8 },
  logoIcon: {
    width: 30, height: 30, borderRadius: 8,
    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  logoText: { fontSize: 16, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' },
  roleChip: {
    fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
    background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe',
  },
  right: { display: 'flex', alignItems: 'center', gap: 10 },
  newTransportBtn: {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '6px 12px', borderRadius: 8,
    background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff',
    border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(37,99,235,0.3)', transition: 'opacity 0.15s',
    whiteSpace: 'nowrap',
  },
  demoBtn: {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '6px 12px', borderRadius: 8,
    background: '#fef2f2', color: '#dc2626',
    border: '1.5px solid #fecaca',
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
    transition: 'all 0.15s',
  },
  bellWrap: {
    position: 'relative', cursor: 'pointer', padding: 6,
    display: 'flex', alignItems: 'center',
  },
  bellBadge: {
    position: 'absolute', top: 0, right: 0,
    width: 16, height: 16, borderRadius: '50%',
    color: '#fff', fontSize: 9, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '2px solid #fff',
  },
  userInfo:   { display: 'flex', alignItems: 'center', gap: 7 },
  userAvatar: {
    width: 32, height: 32, borderRadius: '50%',
    background: 'linear-gradient(135deg, #2563eb, #8b5cf6)',
    color: '#fff', fontSize: 11, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  userName: { fontSize: 13, fontWeight: 600, color: '#0f172a' },
  logoutBtn: {
    background: 'none', border: 'none', padding: 6,
    color: '#64748b', cursor: 'pointer', borderRadius: 6,
    display: 'flex', alignItems: 'center',
    transition: 'color 0.15s',
  },
  chatBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 6, borderRadius: 8, background: '#eff6ff',
    color: '#2563eb', border: '1px solid #bfdbfe',
    cursor: 'pointer', transition: 'background 0.15s',
  },
}
