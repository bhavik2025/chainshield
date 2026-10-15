import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { STATUS_CONFIG, MODE_CONFIG, SEVERITY_CONFIG, DISRUPTION_TYPE_CONFIG } from '../data/mockData'
import Navbar from '../components/Navbar'
import MapView from '../components/MapView'
import ShipmentList from '../components/ShipmentList'
import KPICards from '../components/KPICards'
import AlertModal from '../components/AlertModal'
import GeminiAssistant from '../components/GeminiAssistant'
import { useMobile, useTablet } from '../hooks/useMediaQuery'
import {
  AlertTriangle, X, MapPin, User, Package, ChevronRight,
  Layers, Plus, BarChart2, Map, Menu, Sparkles
} from 'lucide-react'

export default function ManagerDashboard() {
  const navigate = useNavigate()
  const { disruptions, selectedShipment, selectShipment, openAlertModal, alertModal } = useApp()
  const { currentUser } = useAuth()
  const isMobile = useMobile()
  const isTablet = useTablet()
  const isDesktop = !isTablet

  const [sidebarOpen,  setSidebarOpen]  = useState(true)
  const [activeTab,    setActiveTab]    = useState('shipments')
  const [mobileView,   setMobileView]   = useState('map') // 'map' | 'list' | 'disruptions'
  const [detailOpen,   setDetailOpen]   = useState(false)
  const [geminiOpen,   setGeminiOpen]   = useState(false)

  const handleSelectShipment = ship => {
    selectShipment(ship)
    setDetailOpen(true)
    if (isMobile) setMobileView('map')
  }

  const BOTTOM_TABS = [
    { key: 'map',          label: 'Map',          icon: <Map size={18} /> },
    { key: 'list',         label: 'Shipments',    icon: <Layers size={18} /> },
    { key: 'disruptions',  label: 'Alerts',        icon: <AlertTriangle size={18} />, badge: disruptions.length },
    { key: 'new',          label: 'New',           icon: <Plus size={18} /> },
  ]

  // ── Mobile Layout ──────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={s.root}>
        <Navbar />
        <div style={s.mobileBody}>
          {/* KPIs - always visible, compact */}
          <div style={s.mobileKpi}><KPICards compact /></div>

          {/* Main content area */}
          {mobileView === 'map' && (
            <div style={{ flex: 1, position: 'relative' }}>
              <div style={{ height: '100%' }}><MapView height="100%" /></div>
              {detailOpen && selectedShipment && (
                <div style={s.mobileDetailSheet}>
                  <div style={s.sheetHandle} />
                  <ShipmentDetailPanel
                    ship={selectedShipment}
                    onClose={() => { setDetailOpen(false); selectShipment(null) }}
                    onOpenAlert={openAlertModal}
                    disruptions={disruptions}
                  />
                </div>
              )}
            </div>
          )}
          {mobileView === 'list' && (
            <div style={{ flex: 1, overflow: 'hidden', background: '#fff' }}>
              <ShipmentList onOpenAlert={openAlertModal} onSelect={handleSelectShipment} />
            </div>
          )}
          {mobileView === 'disruptions' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
              <DisruptionList disruptions={disruptions} onOpen={openAlertModal} />
            </div>
          )}
        </div>

        {/* Bottom navigation */}
        <nav style={s.bottomNav}>
          {BOTTOM_TABS.map(tab => (
            <button key={tab.key} style={{ ...s.bottomTab, color: mobileView === tab.key ? '#2563eb' : '#94a3b8' }}
              onClick={() => {
                if (tab.key === 'new') { navigate('/manager/new-transport'); return }
                setMobileView(tab.key)
              }}>
              <div style={{ position: 'relative' }}>
                {tab.icon}
                {tab.badge > 0 && <span style={s.tabBadgeDot}>{tab.badge}</span>}
              </div>
              <span style={s.bottomTabLabel}>{tab.label}</span>
            </button>
          ))}
        </nav>
        {alertModal && <AlertModal />}
        {/* Gemini AI FAB */}
        <button style={s.geminiFab} onClick={() => setGeminiOpen(true)} title="Ask ChainShield AI">
          <Sparkles size={18} color="#fff" />
        </button>
        {geminiOpen && <GeminiAssistant onClose={() => setGeminiOpen(false)} />}
      </div>
    )
  }

  // ── Tablet Layout ──────────────────────────────────────────────
  if (isTablet) {
    return (
      <div style={s.root}>
        <Navbar onMenuToggle={() => setSidebarOpen(p => !p)} menuOpen={sidebarOpen} />
        <div style={s.tabletBody}>
          {/* Sliding sidebar drawer */}
          {sidebarOpen && <div style={s.drawerOverlay} onClick={() => setSidebarOpen(false)} />}
          <aside style={{ ...s.drawer, left: sidebarOpen ? 0 : -310 }}>
            <div style={s.drawerHeader}>
              <span style={s.drawerTitle}>Shipments & Alerts</span>
              <button style={s.closeDrw} onClick={() => setSidebarOpen(false)}><X size={16} /></button>
            </div>
            <div style={s.tabRow}>
              <TabBtn active={activeTab === 'shipments'} onClick={() => setActiveTab('shipments')} icon={<Layers size={12}/>} label="Shipments" />
              <TabBtn active={activeTab === 'disruptions'} onClick={() => setActiveTab('disruptions')} icon={<AlertTriangle size={12}/>} label={`Alerts (${disruptions.length})`} danger />
            </div>
            {activeTab === 'shipments'   && <ShipmentList onOpenAlert={openAlertModal} onSelect={s => { handleSelectShipment(s); setSidebarOpen(false) }} />}
            {activeTab === 'disruptions' && <DisruptionList disruptions={disruptions} onOpen={d => { openAlertModal(d); setSidebarOpen(false) }} />}
          </aside>

          <main style={s.tabletMain}>
            <div style={s.kpiRow}><KPICards /></div>
            <div style={{ flex: 1, borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <MapView height="100%" />
            </div>
          </main>

          {/* Right detail panel as modal on tablet */}
          {selectedShipment && (
            <div className="modal-overlay" onClick={() => { selectShipment(null) }}>
              <div style={{ ...s.tabletDetail }} onClick={e => e.stopPropagation()}>
                <ShipmentDetailPanel
                  ship={selectedShipment}
                  onClose={() => selectShipment(null)}
                  onOpenAlert={openAlertModal}
                  disruptions={disruptions}
                />
              </div>
            </div>
          )}
        </div>
        {alertModal && <AlertModal />}
        <button style={s.geminiFab} onClick={() => setGeminiOpen(true)} title="Ask ChainShield AI">
          <Sparkles size={18} color="#fff" />
        </button>
        {geminiOpen && <GeminiAssistant onClose={() => setGeminiOpen(false)} />}
      </div>
    )
  }

  // ── Desktop Layout ─────────────────────────────────────────────
  return (
    <div style={s.root}>
      <Navbar onMenuToggle={() => setSidebarOpen(p => !p)} menuOpen={sidebarOpen} />
      <div style={s.desktopBody}>
        {/* Left sidebar */}
        <aside style={{ ...s.sidebar, width: sidebarOpen ? 300 : 0, minWidth: sidebarOpen ? 300 : 0, overflow: sidebarOpen ? 'hidden' : 'hidden' }}>
          <div style={s.tabRow}>
            <TabBtn active={activeTab === 'shipments'}   onClick={() => setActiveTab('shipments')}   icon={<Layers size={12}/>}        label="Shipments" />
            <TabBtn active={activeTab === 'disruptions'} onClick={() => setActiveTab('disruptions')} icon={<AlertTriangle size={12}/>} label={`Alerts (${disruptions.length})`} danger />
          </div>
          {activeTab === 'shipments'   && <ShipmentList onOpenAlert={openAlertModal} onSelect={handleSelectShipment} />}
          {activeTab === 'disruptions' && <DisruptionList disruptions={disruptions} onOpen={openAlertModal} />}
        </aside>

        {/* Center */}
        <main style={s.desktopMain}>
          <div style={s.kpiRow}><KPICards /></div>
          <div style={{ flex: 1, borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <MapView height="100%" />
          </div>
        </main>

        {/* Right detail */}
        {selectedShipment && (
          <aside style={s.detailPanel}>
            <ShipmentDetailPanel
              ship={selectedShipment}
              onClose={() => selectShipment(null)}
              onOpenAlert={openAlertModal}
              disruptions={disruptions}
            />
          </aside>
        )}
      </div>
      {alertModal && <AlertModal />}
      {/* Gemini AI FAB */}
      <button style={s.geminiFab} onClick={() => setGeminiOpen(true)} title="Ask ChainShield AI">
        <Sparkles size={18} color="#fff" />
      </button>
      {geminiOpen && <GeminiAssistant onClose={() => setGeminiOpen(false)} />}
    </div>
  )
}

/* ── Disruption list ────────────────────────────── */
function DisruptionList({ disruptions, onOpen }) {
  if (!disruptions.length) return (
    <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>No active disruptions
    </div>
  )
  return (
    <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', flex: 1 }}>
      {disruptions.map(dis => {
        const sev = SEVERITY_CONFIG[dis.severity] || SEVERITY_CONFIG.medium
        const typ = DISRUPTION_TYPE_CONFIG[dis.type] || DISRUPTION_TYPE_CONFIG.weather
        return (
          <div key={dis.id} style={{ ...dl.card, borderLeft: `3px solid ${sev.color}` }}>
            <div style={dl.top}>
              <span style={{ fontSize: 18 }}>{typ.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={dl.title}>{dis.title}</div>
                <div style={dl.desc}>{dis.description.substring(0, 80)}…</div>
              </div>
            </div>
            <div style={dl.meta}>
              <span className={`badge ${sev.badgeClass}`}>{sev.label}</span>
              <span style={{ fontSize: 11, color: '#d97706', fontWeight: 600 }}>+{dis.estimatedDelayHours}h</span>
            </div>
            <button style={dl.btn} onClick={() => onOpen(dis)}>View & Resolve <ChevronRight size={12} /></button>
          </div>
        )
      })}
    </div>
  )
}

/* ── Shipment detail panel ──────────────────────── */
function ShipmentDetailPanel({ ship, onClose, onOpenAlert, disruptions }) {
  const stCfg = STATUS_CONFIG[ship.status] || STATUS_CONFIG.on_time
  const modCfg = MODE_CONFIG[ship.mode]    || MODE_CONFIG.sea
  const { operators } = useApp()
  const operator = operators.find(u => u.id === ship.operatorId)
  const disruption = disruptions.find(d => d.id === ship.disruptionId)

  return (
    <div style={dp.panel}>
      <div style={dp.header}>
        <span style={{ fontSize: 26 }}>{modCfg.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={dp.id}>{ship.id}</div>
          <div style={dp.name}>{ship.name}</div>
        </div>
        <button style={dp.closeBtn} onClick={onClose}><X size={16} /></button>
      </div>
      <div style={dp.body}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className={`badge ${stCfg.badgeClass}`}>● {stCfg.label}</span>
          <span style={{ fontSize: 12, color: '#64748b' }}>{modCfg.icon} {modCfg.label}</span>
          {ship.riskScore > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
              background: ship.riskScore >= 70 ? '#fef2f2' : ship.riskScore >= 40 ? '#fffbeb' : '#f0fdf4',
              color:      ship.riskScore >= 70 ? '#dc2626' : ship.riskScore >= 40 ? '#d97706' : '#16a34a',
              border: `1px solid ${ship.riskScore >= 70 ? '#fecaca' : ship.riskScore >= 40 ? '#fde68a' : '#bbf7d0'}`,
            }}>
              {ship.riskScore >= 70 ? '🔴' : ship.riskScore >= 40 ? '🟡' : '🟢'} Risk {ship.riskScore}/100
            </span>
          )}
        </div>
        <div>
          <div style={dp.label}>Progress</div>
          <div style={dp.progBar}><div style={{ ...dp.progFill, width: `${ship.progress}%`, background: stCfg.dot }} /></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={dp.sub}>{ship.origin?.city}</span>
            <span style={{ ...dp.sub, fontWeight: 700, color: stCfg.dot }}>{ship.progress}%</span>
            <span style={dp.sub}>{ship.destination?.city}</span>
          </div>
        </div>
        <InfoRow label="Route"    val={`${ship.origin?.city}, ${ship.origin?.country} → ${ship.destination?.city}, ${ship.destination?.country}`} />
        <InfoRow label="Cargo"    val={`${ship.cargo} · ${ship.weight}`} />
        <InfoRow label="Carrier"  val={ship.carrier} />
        <InfoRow label="ETA"      val={ship.eta} bold />
        <InfoRow label="Departure" val={ship.departureDate} />
        {ship.value > 0 && <InfoRow label="Value" val={`$${ship.value.toLocaleString()}`} />}
        {ship.description && <InfoRow label="Notes" val={ship.description} />}

        {operator && (
          <div style={dp.opBox}>
            <div style={dp.label}>Field Operator</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={dp.opAvatar}>{(operator.name||'?').slice(0,2).toUpperCase()}</div>
              <div>
                <div style={dp.opName}>{operator.name}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{operator.operatorType} · {operator.company}</div>
                {operator.phone && <div style={{ fontSize: 11, color: '#94a3b8' }}>{operator.phone}</div>}
                {operator.email && <div style={{ fontSize: 11, color: '#94a3b8' }}>{operator.email}</div>}
              </div>
            </div>
          </div>
        )}

        {disruption && (
          <div style={dp.alertBox}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#dc2626', marginBottom: 6 }}>
              <AlertTriangle size={13} color="#dc2626" /> Active Disruption
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>{disruption.title}</div>
            <button className="btn btn-danger btn-full btn-sm" style={{ marginTop: 4 }} onClick={() => onOpenAlert(disruption)}>
              View Solutions
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, val, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, padding: '7px 0', borderBottom: '1px solid #f8fafc' }}>
      <span style={{ fontSize: 12, color: '#64748b', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12, color: '#0f172a', fontWeight: bold ? 700 : 400, textAlign: 'right' }}>{val}</span>
    </div>
  )
}

function TabBtn({ active, onClick, icon, label, danger }) {
  return (
    <button style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
      padding: '11px 8px', fontSize: 12, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer',
      borderBottom: `2px solid ${active ? (danger ? '#dc2626' : '#2563eb') : 'transparent'}`,
      color: active ? (danger ? '#dc2626' : '#2563eb') : '#64748b', transition: 'all 0.15s',
    }} onClick={onClick}>{icon}{label}</button>
  )
}

const s = {
  root: { display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden',background:'#f1f5f9' },

  // Mobile
  mobileBody: { flex:1,display:'flex',flexDirection:'column',overflow:'hidden',position:'relative' },
  mobileKpi:  { padding:'8px',background:'#fff',borderBottom:'1px solid #f1f5f9',flexShrink:0 },
  mobileDetailSheet: { position:'absolute',bottom:0,left:0,right:0,background:'#fff',borderRadius:'16px 16px 0 0',boxShadow:'0 -4px 24px rgba(0,0,0,0.12)',maxHeight:'60vh',overflowY:'auto',zIndex:50,animation:'slideUp 0.25s ease' },
  sheetHandle: { width:40,height:4,background:'#e2e8f0',borderRadius:2,margin:'10px auto 6px' },
  bottomNav:  { display:'flex',background:'#fff',borderTop:'1px solid #e2e8f0',flexShrink:0,paddingBottom:'env(safe-area-inset-bottom)' },
  bottomTab:  { flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'10px 4px 8px',background:'none',border:'none',cursor:'pointer',transition:'color 0.15s',position:'relative' },
  bottomTabLabel: { fontSize:10,fontWeight:600 },
  tabBadgeDot: { position:'absolute',top:-2,right:-4,background:'#dc2626',color:'#fff',fontSize:9,fontWeight:700,width:16,height:16,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center' },

  // Tablet
  tabletBody:   { flex:1,display:'flex',overflow:'hidden',position:'relative' },
  drawerOverlay:{ position:'absolute',inset:0,background:'rgba(0,0,0,0.3)',zIndex:20 },
  drawer:       { position:'absolute',top:0,bottom:0,width:300,background:'#fff',borderRight:'1px solid #e2e8f0',display:'flex',flexDirection:'column',transition:'left 0.25s ease',zIndex:30 },
  drawerHeader: { display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',borderBottom:'1px solid #f1f5f9' },
  drawerTitle:  { fontSize:13,fontWeight:700,color:'#0f172a' },
  closeDrw:     { background:'none',border:'none',cursor:'pointer',color:'#94a3b8',padding:4,borderRadius:6 },
  tabletMain:   { flex:1,display:'flex',flexDirection:'column',overflow:'hidden',padding:'12px',position:'relative' },
  tabletDetail: { background:'#fff',borderRadius:16,width:'90%',maxWidth:400,maxHeight:'85vh',overflow:'hidden',display:'flex',flexDirection:'column',animation:'slideUp 0.25s ease' },

  // Desktop
  desktopBody:  { display:'flex',flex:1,overflow:'hidden' },
  sidebar:      { background:'#fff',borderRight:'1px solid #e2e8f0',display:'flex',flexDirection:'column',overflow:'hidden',transition:'width 0.25s ease, min-width 0.25s ease',flexShrink:0 },
  desktopMain:  { flex:1,display:'flex',flexDirection:'column',overflow:'hidden',padding:'12px',position:'relative' },
  detailPanel:  { width:370,minWidth:370,background:'#fff',borderLeft:'1px solid #e2e8f0',overflowY:'auto',animation:'slideInRight 0.25s ease',flexShrink:0 },

  // Shared
  tabRow:   { display:'flex',borderBottom:'1px solid #f1f5f9',flexShrink:0 },
  kpiRow:   { marginBottom:10,flexShrink:0 },
  geminiFab: { position:'fixed',bottom:24,right:24,width:52,height:52,borderRadius:'50%',background:'linear-gradient(135deg,#7c3aed,#2563eb)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 20px rgba(124,58,237,0.45)',zIndex:200,transition:'transform 0.2s' },
  newTransportFab: { position:'absolute',bottom:16,right:16,display:'flex',alignItems:'center',gap:6,padding:'10px 18px',borderRadius:12,background:'linear-gradient(135deg,#2563eb,#1d4ed8)',color:'#fff',border:'none',fontSize:13,fontWeight:700,cursor:'pointer',boxShadow:'0 4px 14px rgba(37,99,235,0.35)',zIndex:10 },
}

const dl = {
  card: { background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:10,padding:'10px 12px',display:'flex',flexDirection:'column',gap:7 },
  top:  { display:'flex',gap:8,alignItems:'flex-start' },
  title:{ fontSize:13,fontWeight:700,color:'#0f172a',marginBottom:2 },
  desc: { fontSize:11,color:'#64748b',lineHeight:1.4 },
  meta: { display:'flex',gap:6,flexWrap:'wrap',alignItems:'center' },
  btn:  { display:'flex',alignItems:'center',justifyContent:'center',gap:4,padding:'6px',borderRadius:7,background:'#dc2626',color:'#fff',border:'none',fontSize:12,fontWeight:600,cursor:'pointer' },
}

const dp = {
  panel:    { display:'flex',flexDirection:'column',height:'100%' },
  header:   { display:'flex',alignItems:'center',gap:10,padding:'14px 16px',borderBottom:'1px solid #f1f5f9',flexShrink:0,background:'#fafbfc' },
  id:       { fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.06em' },
  name:     { fontSize:15,fontWeight:700,color:'#0f172a' },
  closeBtn: { background:'none',border:'none',cursor:'pointer',color:'#94a3b8',padding:4,borderRadius:6 },
  body:     { flex:1,overflowY:'auto',padding:'14px 16px',display:'flex',flexDirection:'column',gap:12 },
  label:    { fontSize:11,fontWeight:600,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:5 },
  progBar:  { height:6,background:'#e2e8f0',borderRadius:3,overflow:'hidden' },
  progFill: { height:'100%',borderRadius:3,transition:'width 0.4s' },
  sub:      { fontSize:11,color:'#94a3b8' },
  opBox:    { background:'#f8fafc',borderRadius:10,padding:'12px' },
  opAvatar: { width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#2563eb,#7c3aed)',color:'#fff',fontSize:12,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 },
  opName:   { fontSize:13,fontWeight:700,color:'#0f172a' },
  alertBox: { background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,padding:'12px' },
}
