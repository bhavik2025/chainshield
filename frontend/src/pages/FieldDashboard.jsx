import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp }  from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useMobile, useTablet } from '../hooks/useMediaQuery'
import { STATUS_CONFIG, MODE_CONFIG, SEVERITY_CONFIG, DISRUPTION_TYPE_CONFIG } from '../data/mockData'
import MapView            from '../components/MapView'
import AlertModal         from '../components/AlertModal'
import NotificationPanel  from '../components/NotificationPanel'
import ChatModal          from '../components/ChatModal'
import StatusUpdatePanel  from '../components/StatusUpdatePanel'
import {
  MapPin, Package, Clock, AlertTriangle, CheckCircle,
  ChevronRight, Phone, Thermometer, Wind, Bell,
  LogOut, Navigation, Truck, Shield, RefreshCw,
  Map, Home, Activity, MessageSquare, User,
  ArrowRight, Zap, Info,
} from 'lucide-react'

export default function FieldDashboard() {
  const { currentUser, logout } = useAuth()
  const { shipments, disruptions, openAlertModal, alertModal, selectShipment,
          getMyNotifications, readNotification, notifications, refresh } = useApp()

  const isMobile  = useMobile()
  const isTablet  = useTablet()
  const isDesktop = !isTablet
  const navigate  = useNavigate()

  const [activeTab, setActiveTab] = useState('overview')

  const myShipment = currentUser?.shipmentId
    ? shipments.find(s => s.id === currentUser.shipmentId)
    : null

  const disruption = myShipment?.disruptionId
    ? disruptions.find(d => d.id === myShipment.disruptionId)
    : null

  const myNotifs    = getMyNotifications(currentUser?.id)
  const unreadCount = myNotifs.filter(n => !n.read).length

  useEffect(() => { if (myShipment) selectShipment(myShipment) }, [myShipment?.id])
  useEffect(() => {
    const timer = setInterval(refresh, 15000)
    return () => clearInterval(timer)
  }, [])

  const handleLogout = () => { logout(); navigate('/') }

  // ── No shipment state ─────────────────────────────────────────
  if (!myShipment) {
    return (
      <div style={g.root}>
        <TopBar currentUser={currentUser} onLogout={handleLogout} isMobile={isMobile}
                disruption={null} unreadCount={unreadCount} />
        <div style={g.emptyWrap}>
          <div style={g.emptyCard}>
            <div style={g.emptyEmoji}>🚢</div>
            <div style={g.emptyTitle}>No Active Shipment</div>
            <div style={g.emptySub}>
              You haven't been assigned to a shipment yet.
              Your operations manager will assign one shortly.
            </div>
            <button style={g.refreshBtn} onClick={refresh}>
              <RefreshCw size={14} /> Check Again
            </button>
          </div>
          {myNotifs.length > 0 && (
            <div style={{ width: '100%', maxWidth: 520 }}>
              <NotificationPanel userId={currentUser.id} />
            </div>
          )}
        </div>
        {alertModal && <AlertModal />}
      </div>
    )
  }

  const stCfg   = STATUS_CONFIG[myShipment.status]  || STATUS_CONFIG.on_time
  const modeCfg = MODE_CONFIG[myShipment.mode]      || MODE_CONFIG.sea

  // ── Mobile ────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={g.root}>
        <TopBar currentUser={currentUser} onLogout={handleLogout} isMobile={true}
                disruption={disruption} unreadCount={unreadCount} />
        {disruption && (
          <div style={g.flashBanner} onClick={() => openAlertModal(disruption)}>
            <Zap size={13} color="#fff" />
            <span style={{ flex: 1 }}>{disruption.title} — Tap to act</span>
            <ChevronRight size={13} color="#fff" />
          </div>
        )}
        <div style={g.mobileContent}>
          {activeTab === 'overview' && (
            <div style={g.scrollPane}>
              <GreetingCard currentUser={currentUser} ship={myShipment} stCfg={stCfg} />
              <ShipmentCard ship={myShipment} stCfg={stCfg} modeCfg={modeCfg} />
              <StatusUpdatePanel ship={myShipment} />
              <WeatherPanel mode={myShipment.mode} hasDisruption={!!disruption} />
              <ManagerCard />
            </div>
          )}
          {activeTab === 'map' && (
            <div style={{ flex: 1, minHeight: 0 }}>
              <MapView height="100%" />
            </div>
          )}
          {activeTab === 'alerts' && (
            <div style={g.scrollPane}>
              <AlertsCard disruption={disruption} openAlertModal={openAlertModal} />
              {myShipment?.appliedSolution && <AppliedSolutionCard solution={myShipment.appliedSolution} />}
            </div>
          )}
          {activeTab === 'notifs' && (
            <div style={{ ...g.scrollPane, padding: '12px' }}>
              {myNotifs.length > 0
                ? <NotificationPanel userId={currentUser.id} />
                : <EmptyNotifs />}
            </div>
          )}
        </div>
        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab}
                   disruption={disruption} unreadCount={unreadCount} />
        {alertModal && <AlertModal />}
      </div>
    )
  }

  // ── Tablet ────────────────────────────────────────────────────
  if (isTablet && !isDesktop) {
    return (
      <div style={g.root}>
        <TopBar currentUser={currentUser} onLogout={handleLogout} isMobile={false}
                disruption={disruption} unreadCount={unreadCount} />
        {disruption && (
          <div style={g.flashBanner} onClick={() => openAlertModal(disruption)}>
            <Zap size={13} color="#fff" />
            <span style={{ flex: 1 }}>{disruption.title} — Click to manage</span>
            <ChevronRight size={13} color="#fff" />
          </div>
        )}
        <div style={tbl.grid}>
          <div style={tbl.left}>
            <GreetingCard currentUser={currentUser} ship={myShipment} stCfg={stCfg} />
            <ShipmentCard ship={myShipment} stCfg={stCfg} modeCfg={modeCfg} />
            <StatusUpdatePanel ship={myShipment} />
            <WeatherPanel mode={myShipment.mode} hasDisruption={!!disruption} />
            <ManagerCard />
            {myNotifs.length > 0 && <NotificationPanel userId={currentUser.id} />}
          </div>
          <div style={tbl.right}>
            <div style={tbl.mapBox}>
              <SectionHeader icon={<MapPin size={13} />} title="Live Route Map" />
              <MapView height="300px" />
            </div>
            <AlertsCard disruption={disruption} openAlertModal={openAlertModal} />
            {myShipment?.appliedSolution && <AppliedSolutionCard solution={myShipment.appliedSolution} />}
          </div>
        </div>
        {alertModal && <AlertModal />}
      </div>
    )
  }

  // ── Desktop ───────────────────────────────────────────────────
  return (
    <div style={g.root}>
      <TopBar currentUser={currentUser} onLogout={handleLogout} isMobile={false}
              disruption={disruption} unreadCount={unreadCount} />
      {disruption && (
        <div style={g.flashBanner} onClick={() => openAlertModal(disruption)}>
          <Zap size={13} color="#fff" />
          <span style={{ flex: 1 }}>
            <strong>{disruption.title}</strong> — Your route is affected. Click to view solutions.
          </span>
          <ChevronRight size={13} color="#fff" />
        </div>
      )}
      <div style={dsk.grid}>
        {/* Left sidebar */}
        <div style={dsk.sidebar}>
          <GreetingCard currentUser={currentUser} ship={myShipment} stCfg={stCfg} />
          <ShipmentCard ship={myShipment} stCfg={stCfg} modeCfg={modeCfg} />
          <StatusUpdatePanel ship={myShipment} />
          <ManagerCard />
        </div>
        {/* Map */}
        <div style={dsk.mapCol}>
          <div style={dsk.mapBox}>
            <div style={dsk.mapHeader}>
              <MapPin size={13} color="#2563eb" />
              <span style={dsk.mapTitle}>Live Route Map</span>
              <span style={{ ...dsk.modeBadge, background: modeCfg.color + '18', color: modeCfg.color }}>
                {modeCfg.icon} {modeCfg.label}
              </span>
            </div>
            <MapView height="100%" />
          </div>
        </div>
        {/* Right panel */}
        <div style={dsk.rightPanel}>
          <WeatherPanel mode={myShipment.mode} hasDisruption={!!disruption} />
          <AlertsCard disruption={disruption} openAlertModal={openAlertModal} />
          {myShipment?.appliedSolution && <AppliedSolutionCard solution={myShipment.appliedSolution} />}
          {myNotifs.length > 0
            ? <NotificationPanel userId={currentUser.id} />
            : <EmptyNotifs compact />}
        </div>
      </div>
      {alertModal && <AlertModal />}
    </div>
  )
}

/* ─────────────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────────────── */

function TopBar({ currentUser, onLogout, isMobile, disruption, unreadCount }) {
  const [chatOpen, setChatOpen] = useState(false)
  const initials = currentUser?.name
    ? currentUser.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'OP'

  return (
    <>
      <nav style={nav.bar}>
        {/* Left: logo + role chip */}
        <div style={nav.left}>
          <div style={nav.logoWrap}>
            <div style={nav.logoIcon}><Shield size={15} color="#fff" strokeWidth={2.5} /></div>
            {!isMobile && <span style={nav.logoText}>ChainShield</span>}
          </div>
          <span style={nav.roleChip}>
            {currentUser?.operatorType || 'Field Operator'}
          </span>
        </div>

        {/* Right: pills + actions */}
        <div style={nav.right}>
          {disruption && (
            <div style={nav.alertPill}>
              <span style={nav.alertDot} />
              {!isMobile && 'Route Alert'}
            </div>
          )}
          {unreadCount > 0 && (
            <div style={nav.notifPill}>
              <Bell size={12} />
              <span>{unreadCount}</span>
            </div>
          )}
          <button style={nav.chatBtn} onClick={() => setChatOpen(true)} title="Direct Messages">
            <MessageSquare size={15} />
            {!isMobile && <span>Chat</span>}
          </button>
          <div style={nav.userInfo}>
            <div style={nav.avatar}>{initials}</div>
            {!isMobile && (
              <div>
                <div style={nav.userName}>{currentUser?.name?.split(' ')[0] || 'Operator'}</div>
                <div style={nav.userSub}>{currentUser?.company || 'Field Ops'}</div>
              </div>
            )}
          </div>
          <button style={nav.logoutBtn} onClick={onLogout} title="Logout">
            <LogOut size={15} />
          </button>
        </div>
      </nav>
      {chatOpen && <ChatModal onClose={() => setChatOpen(false)} />}
    </>
  )
}

function GreetingCard({ currentUser, ship, stCfg }) {
  const initials = currentUser?.name
    ? currentUser.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'OP'
  const now = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div style={gc.wrap}>
      {/* Top row */}
      <div style={gc.top}>
        <div style={gc.avatar}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={gc.greeting}>Hello, {currentUser?.name?.split(' ')[0] || 'Operator'} 👋</div>
          <div style={gc.date}>{now}</div>
        </div>
        <div style={gc.onlineBadge}>
          <span style={gc.onlineDot} />
          Live
        </div>
      </div>
      {/* Stats */}
      <div style={gc.statsRow}>
        <div style={gc.stat}>
          <span style={gc.statVal}>{currentUser?.operatorType || '—'}</span>
          <span style={gc.statLbl}>Role</span>
        </div>
        <div style={gc.divider} />
        <div style={gc.stat}>
          <span style={{ ...gc.statVal, color: stCfg.dot }}>● {stCfg.label}</span>
          <span style={gc.statLbl}>Status</span>
        </div>
        <div style={gc.divider} />
        <div style={gc.stat}>
          <span style={gc.statVal}>{ship.progress}%</span>
          <span style={gc.statLbl}>Progress</span>
        </div>
      </div>
    </div>
  )
}

function ShipmentCard({ ship, stCfg, modeCfg }) {
  return (
    <div style={card.wrap}>
      <SectionHeader icon={<Package size={13} />} title="My Active Shipment" />
      <div style={card.body}>
        {/* Title row */}
        <div style={sc.titleRow}>
          <span style={sc.modeEmoji}>{modeCfg.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={sc.shipId}>{ship.id}</div>
            <div style={sc.shipName} title={ship.name}>{ship.name}</div>
          </div>
          <span style={{ ...sc.statusBadge, background: stCfg.dot + '18', color: stCfg.dot, border: `1px solid ${stCfg.dot}40` }}>
            ● {stCfg.label}
          </span>
        </div>

        {/* Route */}
        <div style={sc.routeBox}>
          <div style={sc.routeEnd}>
            <div style={{ ...sc.routeDot, background: '#94a3b8' }} />
            <div>
              <div style={sc.city}>{ship.origin?.city || '—'}</div>
              <div style={sc.country}>{ship.origin?.country || ''}</div>
            </div>
          </div>
          <div style={sc.routeTrack}>
            <div style={sc.routeLine} />
            <span style={sc.routeMode}>{modeCfg.icon}</span>
            <div style={sc.routeLine} />
          </div>
          <div style={sc.routeEnd}>
            <div style={{ ...sc.routeDot, background: stCfg.dot }} />
            <div>
              <div style={sc.city}>{ship.destination?.city || '—'}</div>
              <div style={sc.country}>{ship.destination?.country || ''}</div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={sc.progressWrap}>
          <div style={sc.progressHeader}>
            <span style={sc.progressLbl}>Journey Progress</span>
            <span style={{ ...sc.progressLbl, fontWeight: 700, color: stCfg.dot }}>{ship.progress}%</span>
          </div>
          <div style={sc.progressBg}>
            <div style={{ ...sc.progressFill, width: `${ship.progress}%`, background: `linear-gradient(90deg, ${stCfg.dot}88, ${stCfg.dot})` }} />
          </div>
        </div>

        {/* Metrics */}
        <div style={sc.metrics}>
          <MetricTile icon={<Clock size={12} color="#2563eb" />} label="ETA" value={ship.eta || '—'} />
          <MetricTile icon={<Package size={12} color="#7c3aed" />} label="Cargo" value={ship.cargo || '—'} />
          <MetricTile icon={<Navigation size={12} color="#ea580c" />} label="Carrier" value={ship.carrier || '—'} />
          <MetricTile icon={<Truck size={12} color="#0891b2" />} label="Mode" value={modeCfg.label} />
        </div>
      </div>
    </div>
  )
}

function WeatherPanel({ mode, hasDisruption }) {
  const wx = hasDisruption
    ? { icon: '⛈️', label: 'Storm Ahead', temp: '18°C', wind: '95 knots', cond: mode === 'sea' ? '🌊 5m waves' : mode === 'air' ? '☁ Severe turbulence' : '🛣 Hazardous roads', status: 'Caution', danger: true }
    : { icon: '⛅', label: 'Partly Cloudy', temp: '24°C', wind: '12 knots', cond: mode === 'sea' ? '🌊 1.2m waves' : mode === 'air' ? '☁ Cloud cover 40%' : '🛣 Clear roads', status: 'Normal', danger: false }

  return (
    <div style={{ ...card.wrap, borderColor: wx.danger ? '#fecaca' : '#e2e8f0' }}>
      <SectionHeader
        icon={<Thermometer size={13} color={wx.danger ? '#dc2626' : '#64748b'} />}
        title="Conditions Ahead"
        badge={wx.danger
          ? { label: '⚠ Caution', color: '#dc2626' }
          : { label: '✓ Clear', color: '#16a34a' }}
      />
      <div style={wp.body}>
        <span style={wp.icon}>{wx.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...wp.label, color: wx.danger ? '#dc2626' : '#0f172a' }}>{wx.label}</div>
          <div style={wp.details}>
            <span>🌡 {wx.temp}</span>
            <span><Wind size={10} style={{ verticalAlign: 'middle' }} /> {wx.wind}</span>
            <span>{wx.cond}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function ManagerCard() {
  return (
    <div style={card.wrap}>
      <SectionHeader icon={<User size={13} />} title="Operations Manager" />
      <div style={mc.body}>
        <div style={mc.avatar}>OPS</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={mc.name}>Operations Manager</div>
          <div style={mc.status}>
            <span style={mc.dot} />
            Online · Monitoring your route
          </div>
        </div>
        <button style={mc.contactBtn}>
          <Phone size={12} /> Contact
        </button>
      </div>
    </div>
  )
}

function AlertsCard({ disruption, openAlertModal }) {
  return (
    <div style={{ ...card.wrap, borderColor: disruption ? '#fecaca' : '#e2e8f0' }}>
      <SectionHeader
        icon={<AlertTriangle size={13} color={disruption ? '#dc2626' : '#16a34a'} />}
        title="Route Alerts"
        badge={disruption
          ? { label: '1 Active', color: '#dc2626' }
          : { label: 'All Clear', color: '#16a34a' }}
      />
      {!disruption ? (
        <div style={al.allClear}>
          <div style={al.clearIcon}><CheckCircle size={28} color="#16a34a" /></div>
          <div style={al.clearTitle}>Route is clear</div>
          <div style={al.clearSub}>No disruptions detected along your route. Safe journey!</div>
        </div>
      ) : (
        <DisruptionCard disruption={disruption} openAlertModal={openAlertModal} />
      )}
    </div>
  )
}

function DisruptionCard({ disruption, openAlertModal }) {
  const sevCfg  = SEVERITY_CONFIG[disruption.severity]  || { color: '#f59e0b', label: 'Medium' }
  const typeCfg = DISRUPTION_TYPE_CONFIG[disruption.type] || { icon: '⚠️' }

  return (
    <div style={dc.wrap} onClick={() => openAlertModal(disruption)}>
      <div style={dc.header}>
        <span style={dc.typeIcon}>{typeCfg.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={dc.title}>{disruption.title}</div>
          <div style={dc.desc}>{disruption.description?.substring(0, 100)}…</div>
        </div>
      </div>
      <div style={dc.footer}>
        <span style={{ ...dc.sevBadge, background: sevCfg.color + '18', color: sevCfg.color }}>
          {sevCfg.label}
        </span>
        <span style={dc.delay}>+{disruption.estimatedDelayHours}h delay</span>
        <button style={dc.actionBtn} onClick={e => { e.stopPropagation(); openAlertModal(disruption) }}>
          Solutions <ArrowRight size={11} />
        </button>
      </div>
    </div>
  )
}

function AppliedSolutionCard({ solution }) {
  return (
    <div style={{ ...card.wrap, borderColor: '#bbf7d0', background: '#f0fdf4' }}>
      <SectionHeader icon={<CheckCircle size={13} color="#16a34a" />} title="Applied Route Solution" />
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>✅ {solution.title}</div>
        <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>{solution.description}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <BadgePill color="#2563eb"   bg="#eff6ff" border="#bfdbfe">+{solution.extraTimeHours}h</BadgePill>
          <BadgePill color="#d97706"   bg="#fffbeb" border="#fde68a">+${solution.extraCostUSD?.toLocaleString()}</BadgePill>
          <BadgePill color="#16a34a"   bg="#f0fdf4" border="#bbf7d0">Risk {solution.riskScore}/100</BadgePill>
        </div>
      </div>
    </div>
  )
}

function EmptyNotifs({ compact }) {
  return (
    <div style={{ ...card.wrap, padding: compact ? '16px' : '28px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <Bell size={26} color="#e2e8f0" />
      <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>No notifications yet</div>
      <div style={{ fontSize: 11, color: '#cbd5e1' }}>Manager instructions will appear here</div>
    </div>
  )
}

function BottomNav({ activeTab, setActiveTab, disruption, unreadCount }) {
  const tabs = [
    { id: 'overview', icon: <Home size={19} />,          label: 'Overview' },
    { id: 'map',      icon: <Map size={19} />,           label: 'Map' },
    { id: 'alerts',   icon: <AlertTriangle size={19} />, label: 'Alerts',  dot: !!disruption },
    { id: 'notifs',   icon: <Bell size={19} />,          label: 'Notifs',  count: unreadCount },
  ]
  return (
    <div style={bn.bar}>
      {tabs.map(tab => {
        const active = activeTab === tab.id
        return (
          <button
            key={tab.id}
            style={{ ...bn.tab, color: active ? '#2563eb' : '#94a3b8' }}
            onClick={() => setActiveTab(tab.id)}
          >
            {active && <div style={bn.activeBar} />}
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              {tab.icon}
              {tab.dot && <span style={bn.dotBadge} />}
              {tab.count > 0 && <span style={bn.countBadge}>{tab.count}</span>}
            </div>
            <span style={{ ...bn.label, fontWeight: active ? 700 : 500 }}>{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function SectionHeader({ icon, title, badge }) {
  return (
    <div style={sh.wrap}>
      <span style={sh.icon}>{icon}</span>
      <span style={sh.title}>{title}</span>
      {badge && (
        <span style={{ ...sh.badge, color: badge.color, background: badge.color + '14', border: `1px solid ${badge.color}30` }}>
          {badge.label}
        </span>
      )}
    </div>
  )
}

function MetricTile({ icon, label, value }) {
  return (
    <div style={mt.wrap}>
      {icon}
      <div style={mt.value} title={value}>{value}</div>
      <div style={mt.label}>{label}</div>
    </div>
  )
}

function BadgePill({ color, bg, border, children }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, color, background: bg, border: `1px solid ${border}` }}>
      {children}
    </span>
  )
}

/* ─────────────────────────────────────────────────────
   STYLES
───────────────────────────────────────────────────── */

const g = {
  root:         { display: 'flex', flexDirection: 'column', height: '100vh', background: '#f1f5f9', overflow: 'hidden', fontFamily: 'Inter, system-ui, sans-serif' },
  mobileContent:{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  scrollPane:   { flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 12 },
  flashBanner:  { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', background: 'linear-gradient(90deg,#dc2626,#b91c1c)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0, userSelect: 'none' },
  emptyWrap:    { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  emptyCard:    { background: '#fff', borderRadius: 16, padding: '32px 28px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, maxWidth: 400, width: '100%' },
  emptyEmoji:   { fontSize: 52 },
  emptyTitle:   { fontSize: 18, fontWeight: 800, color: '#0f172a' },
  emptySub:     { fontSize: 13, color: '#94a3b8', lineHeight: 1.6, maxWidth: 280 },
  refreshBtn:   { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 10, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 4 },
}

const nav = {
  bar:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: 56, background: '#fff', borderBottom: '1px solid #e2e8f0', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  left:     { display: 'flex', alignItems: 'center', gap: 10 },
  logoWrap: { display: 'flex', alignItems: 'center', gap: 8 },
  logoIcon: { width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#16a34a,#15803d)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  logoText: { fontSize: 16, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' },
  roleChip: { fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' },
  right:    { display: 'flex', alignItems: 'center', gap: 8 },
  alertPill:{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 20, background: '#fef2f2', color: '#dc2626', fontSize: 11, fontWeight: 700, border: '1px solid #fecaca' },
  alertDot: { width: 6, height: 6, borderRadius: '50%', background: '#dc2626' },
  notifPill:{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, background: '#eff6ff', color: '#2563eb', fontSize: 11, fontWeight: 700, border: '1px solid #bfdbfe' },
  chatBtn:  { display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  userInfo: { display: 'flex', alignItems: 'center', gap: 8 },
  avatar:   { width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#16a34a,#2563eb)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  userName: { fontSize: 13, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 },
  userSub:  { fontSize: 10, color: '#94a3b8' },
  logoutBtn:{ background: 'none', border: 'none', padding: 7, color: '#94a3b8', cursor: 'pointer', borderRadius: 8, display: 'flex', alignItems: 'center' },
}

const card = {
  wrap: { background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', flexShrink: 0 },
  body: { padding: '14px' },
}

const gc = {
  wrap:      { background: 'linear-gradient(135deg,#1e3a8a,#4c1d95)', borderRadius: 14, padding: '16px', boxShadow: '0 4px 20px rgba(37,99,235,0.25)', flexShrink: 0 },
  top:       { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatar:    { width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.3)', flexShrink: 0 },
  greeting:  { fontSize: 15, fontWeight: 800, color: '#fff' },
  date:      { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  onlineBadge:{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(74,222,128,0.2)', border: '1px solid rgba(74,222,128,0.4)', borderRadius: 20, padding: '3px 9px', fontSize: 11, fontWeight: 700, color: '#4ade80', flexShrink: 0 },
  onlineDot: { width: 6, height: 6, borderRadius: '50%', background: '#4ade80' },
  statsRow:  { display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 0' },
  stat:      { flex: 1, textAlign: 'center' },
  statVal:   { display: 'block', fontSize: 12, fontWeight: 700, color: '#fff' },
  statLbl:   { display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  divider:   { width: 1, height: 28, background: 'rgba(255,255,255,0.15)' },
}

const sc = {
  titleRow:    { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 },
  modeEmoji:   { fontSize: 26, flexShrink: 0 },
  shipId:      { fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' },
  shipName:    { fontSize: 14, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  statusBadge: { fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, flexShrink: 0, whiteSpace: 'nowrap' },
  routeBox:    { display: 'flex', alignItems: 'center', gap: 0, marginBottom: 14, background: '#f8fafc', borderRadius: 10, padding: '10px 12px' },
  routeEnd:    { display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 },
  routeDot:    { width: 9, height: 9, borderRadius: '50%', flexShrink: 0 },
  city:        { fontSize: 13, fontWeight: 700, color: '#0f172a' },
  country:     { fontSize: 10, color: '#94a3b8' },
  routeTrack:  { flex: 1, display: 'flex', alignItems: 'center', gap: 0, padding: '0 6px' },
  routeLine:   { flex: 1, height: 2, background: 'linear-gradient(90deg,#cbd5e1,#94a3b8)', borderRadius: 1 },
  routeMode:   { fontSize: 14, background: '#f8fafc', padding: '0 5px', flexShrink: 0 },
  progressWrap:  { marginBottom: 14 },
  progressHeader:{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 },
  progressLbl:   { fontSize: 11, color: '#94a3b8', fontWeight: 500 },
  progressBg:    { height: 7, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 4, transition: 'width 0.5s ease' },
  metrics:       { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 },
}

const wp = {
  body:    { padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 },
  icon:    { fontSize: 28, flexShrink: 0 },
  label:   { fontSize: 14, fontWeight: 700, marginBottom: 4 },
  details: { display: 'flex', gap: 10, fontSize: 11, color: '#64748b', flexWrap: 'wrap', alignItems: 'center' },
}

const mc = {
  body:      { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' },
  avatar:    { width: 38, height: 38, borderRadius: '50%', background: '#eff6ff', color: '#2563eb', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #bfdbfe', flexShrink: 0 },
  name:      { fontSize: 13, fontWeight: 700, color: '#0f172a' },
  status:    { display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#64748b', marginTop: 2 },
  dot:       { width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block', flexShrink: 0 },
  contactBtn:{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 8, background: '#eff6ff', color: '#2563eb', border: '1.5px solid #bfdbfe', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 },
}

const al = {
  allClear:  { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '24px 16px', textAlign: 'center' },
  clearIcon: {},
  clearTitle:{ fontSize: 14, fontWeight: 700, color: '#16a34a' },
  clearSub:  { fontSize: 12, color: '#94a3b8', lineHeight: 1.5, maxWidth: 220 },
}

const dc = {
  wrap:      { margin: '10px', border: '1.5px solid #fecaca', borderRadius: 12, padding: '12px', cursor: 'pointer', background: '#fffafa', transition: 'box-shadow 0.15s' },
  header:    { display: 'flex', gap: 10, marginBottom: 10 },
  typeIcon:  { fontSize: 22, flexShrink: 0 },
  title:     { fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 4 },
  desc:      { fontSize: 12, color: '#64748b', lineHeight: 1.4 },
  footer:    { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  sevBadge:  { fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20 },
  delay:     { fontSize: 12, color: '#dc2626', fontWeight: 600 },
  actionBtn: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, background: '#dc2626', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
}

const sh = {
  wrap:  { display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderBottom: '1px solid #f1f5f9', background: '#fafbfc', flexShrink: 0 },
  icon:  { display: 'flex', alignItems: 'center', color: '#64748b' },
  title: { fontSize: 11, fontWeight: 700, color: '#475569', flex: 1, textTransform: 'uppercase', letterSpacing: '0.04em' },
  badge: { fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 },
}

const mt = {
  wrap:  { background: '#f8fafc', borderRadius: 10, padding: '10px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, border: '1px solid #e2e8f0', textAlign: 'center' },
  value: { fontSize: 11, fontWeight: 700, color: '#0f172a', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' },
  label: { fontSize: 10, color: '#94a3b8' },
}

const bn = {
  bar:       { display: 'flex', background: '#fff', borderTop: '1px solid #e2e8f0', paddingBottom: 'env(safe-area-inset-bottom, 0px)', flexShrink: 0 },
  tab:       { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '10px 4px 8px', background: 'none', border: 'none', cursor: 'pointer', position: 'relative', transition: 'color 0.15s' },
  activeBar: { position: 'absolute', top: 0, left: '20%', right: '20%', height: 2, background: '#2563eb', borderRadius: '0 0 2px 2px' },
  label:     { fontSize: 10 },
  dotBadge:  { position: 'absolute', top: 0, right: -2, width: 7, height: 7, borderRadius: '50%', background: '#dc2626', border: '1.5px solid #fff' },
  countBadge:{ position: 'absolute', top: -2, right: -6, minWidth: 16, height: 16, borderRadius: 8, background: '#2563eb', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' },
}

const tbl = {
  grid: { flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, padding: '14px', overflowY: 'auto', alignItems: 'start' },
  left: { display: 'flex', flexDirection: 'column', gap: 12 },
  right:{ display: 'flex', flexDirection: 'column', gap: 12 },
  mapBox:{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
}

const dsk = {
  grid:      { flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '280px 1fr 300px', gap: 14, padding: '14px', overflow: 'hidden' },
  sidebar:   { display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', minHeight: 0, paddingRight: 2 },
  mapCol:    { display: 'flex', flexDirection: 'column', minHeight: 0 },
  mapBox:    { flex: 1, minHeight: 0, background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' },
  mapHeader: { display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderBottom: '1px solid #f1f5f9', background: '#fafbfc', flexShrink: 0 },
  mapTitle:  { fontSize: 11, fontWeight: 700, color: '#475569', flex: 1, textTransform: 'uppercase', letterSpacing: '0.04em' },
  modeBadge: { fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20 },
  rightPanel:{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', minHeight: 0, paddingLeft: 2 },
}
