import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp }  from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useMobile } from '../hooks/useMediaQuery'
import { CITIES } from '../data/cities'
import ChatModal from '../components/ChatModal'
import GeminiAssistant from '../components/GeminiAssistant'
import {
  Shield, LogOut, Users, Package, MapPin, Activity, Settings,
  UserCheck, UserX, Trash2, Plus, X, CheckCircle, AlertTriangle,
  Clock, TrendingUp, DollarSign, Globe, Search, ChevronDown,
  RefreshCw, Eye, Zap, Navigation, ArrowUp, ArrowDown, Lock, MessageSquare, Sparkles,
} from 'lucide-react'

const MODE_ICON  = { sea: '🚢', air: '✈️', road: '🚛', rail: '🚂' }
const ROLE_COLOR = { admin: '#7c3aed', manager: '#2563eb', operator: '#16a34a', system: '#64748b' }
const ROLE_BG    = { admin: '#f5f3ff', manager: '#eff6ff', operator: '#f0fdf4', system: '#f8fafc' }

const ACTION_LABEL = {
  LOGIN: 'Login', REGISTER: 'Register', CREATE_SHIPMENT: 'New Shipment',
  RESOLVE_DISRUPTION: 'Disruption Resolved', DISRUPTION_DETECTED: 'Alert Detected',
  ACTIVATE_USER: 'User Activated', DEACTIVATE_USER: 'User Suspended', DELETE_USER: 'User Deleted',
  ROLE_UPDATED: 'Role Changed',
  ADD_BASE_CITY: 'Hub Added', REMOVE_BASE_CITY: 'Hub Removed',
  ADD_CARGO_TYPE: 'Cargo Type Added', REMOVE_CARGO_TYPE: 'Cargo Type Removed',
}

const ACTION_COLOR = {
  LOGIN: '#2563eb', REGISTER: '#16a34a', CREATE_SHIPMENT: '#7c3aed',
  RESOLVE_DISRUPTION: '#16a34a', DISRUPTION_DETECTED: '#dc2626',
  ACTIVATE_USER: '#16a34a', DEACTIVATE_USER: '#d97706', DELETE_USER: '#dc2626',
  ROLE_UPDATED: '#7c3aed',
  ADD_BASE_CITY: '#0891b2', REMOVE_BASE_CITY: '#64748b',
  ADD_CARGO_TYPE: '#0891b2', REMOVE_CARGO_TYPE: '#64748b',
}

const TABS = [
  { id: 'overview',  label: 'Overview',     icon: Activity },
  { id: 'users',     label: 'Users',        icon: Users },
  { id: 'shipments', label: 'Shipments',    icon: Package },
  { id: 'hubs',      label: 'Base Cities',  icon: Globe },
  { id: 'config',    label: 'System Config',icon: Settings },
  { id: 'log',       label: 'Activity Log', icon: Clock },
]

export default function AdminDashboard() {
  const { currentUser, logout } = useAuth()
  const { shipments, disruptions, users, baseCities, cargoTypes, activityLog,
          toggleUserActive, removeUser, setUserRole, addHub, removeHub,
          addCargo, removeCargo, refresh } = useApp()
  const isMobile = useMobile()
  const navigate = useNavigate()

  const [activeTab,   setActiveTab]   = useState('overview')
  const [chatOpen,    setChatOpen]    = useState(false)
  const [geminiOpen,  setGeminiOpen]  = useState(false)

  const handleLogout = () => { logout(); navigate('/') }

  const initials = currentUser?.name
    ? currentUser.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'AD'

  return (
    <div style={g.root}>
      {/* ── Top Bar ── */}
      <div style={g.topBar}>
        <div style={g.brand}>
          <div style={g.logoWrap}><Shield size={16} color="#fff" /></div>
          {!isMobile && <span style={g.brandName}>ChainShield</span>}
          <span style={g.adminBadge}>Admin Panel</span>
        </div>
        <div style={g.topRight}>
          <button style={g.chatBtn} onClick={() => setChatOpen(true)} title="Direct Messages">
            <MessageSquare size={14} />
            {!isMobile && 'Chat'}
          </button>
          <button style={g.refreshBtn} onClick={refresh} title="Refresh all data">
            <RefreshCw size={14} />
            {!isMobile && 'Refresh'}
          </button>
          <div style={g.avatar}>{initials}</div>
          {!isMobile && <span style={g.userName}>{currentUser?.name}</span>}
          <button style={g.logoutBtn} onClick={handleLogout}>
            <LogOut size={14} />
            {!isMobile && 'Logout'}
          </button>
        </div>
      </div>

      {/* ── Tab navigation ── */}
      <div style={g.tabBar}>
        {TABS.map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button key={tab.id} style={{ ...g.tabBtn, ...(active ? g.tabActive : {}) }}
              onClick={() => setActiveTab(tab.id)}>
              <Icon size={14} />
              {!isMobile && tab.label}
            </button>
          )
        })}
      </div>

      {chatOpen && <ChatModal onClose={() => setChatOpen(false)} />}

      {/* ── Tab content ── */}
      <div style={g.content}>
        {activeTab === 'overview'  && <OverviewTab  shipments={shipments} disruptions={disruptions} users={users} activityLog={activityLog} baseCities={baseCities} />}
        {activeTab === 'users'     && <UsersTab     users={users} shipments={shipments} toggleUserActive={toggleUserActive} removeUser={removeUser} setUserRole={setUserRole} currentUser={currentUser} />}
        {activeTab === 'shipments' && <ShipmentsTab shipments={shipments} users={users} disruptions={disruptions} />}
        {activeTab === 'hubs'      && <HubsTab      baseCities={baseCities} addHub={addHub} removeHub={removeHub} />}
        {activeTab === 'config'    && <ConfigTab    cargoTypes={cargoTypes} addCargo={addCargo} removeCargo={removeCargo} />}
        {activeTab === 'log'       && <LogTab       activityLog={activityLog} />}
      </div>

      {/* ── Gemini AI FAB ── */}
      <button style={g.geminiFab} onClick={() => setGeminiOpen(true)} title="Ask ChainShield AI">
        <Sparkles size={18} color="#fff" />
      </button>
      {geminiOpen && <GeminiAssistant onClose={() => setGeminiOpen(false)} />}
    </div>
  )
}

/* ── OVERVIEW TAB ─────────────────────────────────────────────── */
function OverviewTab({ shipments, disruptions, users, activityLog, baseCities }) {
  const totalValue   = shipments.reduce((s, sh) => s + (sh.value || 0), 0)
  const valueAtRisk  = shipments.filter(s => s.status !== 'on_time').reduce((s, sh) => s + (sh.value || 0), 0)
  const fmt = n => n >= 1e6 ? `$${(n/1e6).toFixed(1)}M` : `$${(n/1000).toFixed(0)}K`

  const kpis = [
    { label: 'Total Users',       value: users.length,                                  icon: Users,        color: '#2563eb', bg: '#eff6ff' },
    { label: 'Active Shipments',  value: shipments.length,                              icon: Package,      color: '#7c3aed', bg: '#f5f3ff' },
    { label: 'Active Disruptions',value: disruptions.length,                            icon: AlertTriangle,color: '#dc2626', bg: '#fef2f2' },
    { label: 'Logistics Hubs',    value: baseCities.length,                             icon: Globe,        color: '#0891b2', bg: '#ecfeff' },
    { label: 'Total Cargo Value', value: fmt(totalValue),                               icon: DollarSign,   color: '#16a34a', bg: '#f0fdf4' },
    { label: 'Value at Risk',     value: fmt(valueAtRisk),                              icon: TrendingUp,   color: '#ea580c', bg: '#fff7ed' },
    { label: 'Managers',          value: users.filter(u => u.role === 'manager').length,icon: UserCheck,    color: '#2563eb', bg: '#eff6ff' },
    { label: 'Field Operators',   value: users.filter(u => u.role === 'operator').length,icon: Navigation,  color: '#16a34a', bg: '#f0fdf4' },
  ]

  return (
    <div style={ov.wrap}>
      {/* KPI grid */}
      <div style={ov.kpiGrid}>
        {kpis.map(k => {
          const Icon = k.icon
          return (
            <div key={k.label} style={{ ...ov.kpiCard, background: k.bg }}>
              <div style={{ ...ov.kpiIcon, background: k.color + '20' }}>
                <Icon size={18} color={k.color} />
              </div>
              <div style={{ ...ov.kpiVal, color: k.color }}>{k.value}</div>
              <div style={ov.kpiLbl}>{k.label}</div>
            </div>
          )
        })}
      </div>

      {/* Shipment breakdown */}
      <div style={ov.row}>
        <div style={ov.card}>
          <div style={ov.cardTitle}>Shipments by Status</div>
          {[
            { label: 'On Time',   count: shipments.filter(s => s.status === 'on_time').length,  color: '#16a34a' },
            { label: 'At Risk',   count: shipments.filter(s => s.status === 'at_risk').length,  color: '#d97706' },
            { label: 'Disrupted', count: shipments.filter(s => s.status === 'disrupted').length,color: '#dc2626' },
          ].map(row => (
            <div key={row.label} style={ov.barRow}>
              <span style={ov.barLabel}>{row.label}</span>
              <div style={ov.barBg}>
                <div style={{ ...ov.barFill, width: shipments.length ? `${(row.count / shipments.length) * 100}%` : '0%', background: row.color }} />
              </div>
              <span style={{ ...ov.barCount, color: row.color }}>{row.count}</span>
            </div>
          ))}
        </div>

        <div style={ov.card}>
          <div style={ov.cardTitle}>Shipments by Mode</div>
          {Object.entries(MODE_ICON).map(([mode, icon]) => {
            const count = shipments.filter(s => s.mode === mode).length
            return (
              <div key={mode} style={ov.barRow}>
                <span style={ov.barLabel}>{icon} {mode.charAt(0).toUpperCase() + mode.slice(1)}</span>
                <div style={ov.barBg}>
                  <div style={{ ...ov.barFill, width: shipments.length ? `${(count / shipments.length) * 100}%` : '0%', background: '#2563eb' }} />
                </div>
                <span style={{ ...ov.barCount, color: '#2563eb' }}>{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent activity */}
      <div style={ov.card}>
        <div style={ov.cardTitle}>Recent Activity</div>
        {activityLog.slice(0, 8).map(log => (
          <LogRow key={log.id} log={log} />
        ))}
        {activityLog.length === 0 && <Empty label="No activity recorded yet" />}
      </div>
    </div>
  )
}

/* ── USERS TAB ────────────────────────────────────────────────── */
function UsersTab({ users, shipments, toggleUserActive, removeUser, setUserRole, currentUser }) {
  const [search,     setSearch]     = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [confirmDel, setConfirmDel] = useState(null)
  const [deleting,   setDeleting]   = useState(false)
  const [delError,   setDelError]   = useState('')

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    const matchQ = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.company || '').toLowerCase().includes(q)
    const matchR = roleFilter === 'all' || u.role === roleFilter
    return matchQ && matchR
  })

  return (
    <div style={ut.wrap}>
      {/* Filters */}
      <div style={ut.toolbar}>
        <div style={ut.searchWrap}>
          <Search size={14} color="#94a3b8" style={{ flexShrink: 0 }} />
          <input style={ut.searchInput} placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select style={ut.filter} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="operator">Operator</option>
        </select>
        <div style={ut.count}>{filtered.length} users</div>
      </div>

      {/* User cards */}
      <div style={ut.grid}>
        {filtered.map(user => {
          const ship = shipments.find(s => s.id === user.shipmentId)
          const isMe = user.id === currentUser?.id
          return (
            <div key={user.id} style={{ ...ut.card, opacity: user.active === false ? 0.65 : 1 }}>
              <div style={ut.cardTop}>
                <div style={{ ...ut.avatar, background: ROLE_BG[user.role] || '#f1f5f9', color: ROLE_COLOR[user.role] || '#64748b' }}>
                  {user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={ut.name}>{user.name} {isMe && <span style={ut.meTag}>You</span>}</div>
                  <div style={ut.email}>{user.email}</div>
                </div>
                <span style={{ ...ut.roleBadge, background: ROLE_BG[user.role], color: ROLE_COLOR[user.role] }}>
                  {user.role}
                </span>
              </div>

              <div style={ut.meta}>
                {user.operatorType && <MetaTag label="Type" value={user.operatorType} />}
                <MetaTag label="Company" value={user.company || '—'} />
                {user.phone && <MetaTag label="Phone" value={user.phone} />}
                {ship && <MetaTag label="Shipment" value={ship.name} highlight />}
                <MetaTag label="Status" value={user.active === false ? 'Inactive' : 'Active'} color={user.active === false ? '#dc2626' : '#16a34a'} />
                <MetaTag label="Joined" value={new Date(user.createdAt).toLocaleDateString()} />
              </div>

              {/* Protected system admin — show lock indicator, no action buttons */}
              {user.email === 'bhavik@gmail.com' && (
                <div style={ut.protectedRow}>
                  <Lock size={12} color="#7c3aed" />
                  <span style={ut.protectedLabel}>System Admin · Protected</span>
                </div>
              )}

              {/* Role-aware action buttons — hidden for self and for protected admin */}
              {!isMe && user.email !== 'bhavik@gmail.com' && (
                <div style={ut.actions}>

                  {/* ── Operator: Suspend/Activate + promote to Manager + Delete ── */}
                  {user.role === 'operator' && <>
                    {user.active === false
                      ? <ActionBtn icon={<UserCheck size={13} />} label="Activate"  color="#16a34a" bg="#f0fdf4" onClick={() => toggleUserActive(user.id, true)} />
                      : <ActionBtn icon={<UserX size={13} />}     label="Suspend"   color="#d97706" bg="#fffbeb" onClick={() => toggleUserActive(user.id, false)} />
                    }
                    <ActionBtn icon={<ArrowUp size={13} />}  label="→ Manager" color="#2563eb" bg="#eff6ff" onClick={() => setUserRole(user.id, 'manager')} />
                    <ActionBtn icon={<Trash2 size={13} />}   label="Delete"    color="#dc2626" bg="#fef2f2" onClick={() => setConfirmDel(user)} />
                  </>}

                  {/* ── Manager: promote to Admin + demote to Operator + Delete ── */}
                  {user.role === 'manager' && <>
                    <ActionBtn icon={<Shield size={13} />}    label="→ Admin"    color="#7c3aed" bg="#f5f3ff" onClick={() => setUserRole(user.id, 'admin')} />
                    <ActionBtn icon={<ArrowDown size={13} />} label="→ Operator" color="#d97706" bg="#fffbeb" onClick={() => setUserRole(user.id, 'operator')} />
                    <ActionBtn icon={<Trash2 size={13} />}    label="Delete"     color="#dc2626" bg="#fef2f2" onClick={() => setConfirmDel(user)} />
                  </>}

                  {/* ── Admin (non-protected): demote to Manager + Delete ── */}
                  {user.role === 'admin' && <>
                    <ActionBtn icon={<ArrowDown size={13} />} label="→ Manager" color="#64748b" bg="#f8fafc" onClick={() => setUserRole(user.id, 'manager')} />
                    <ActionBtn icon={<Trash2 size={13} />}    label="Delete"    color="#dc2626" bg="#fef2f2" onClick={() => setConfirmDel(user)} />
                  </>}

                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && <Empty label="No users match your search" />}
      </div>

      {/* Delete confirmation modal */}
      {confirmDel && (
        <Modal onClose={() => { if (!deleting) { setConfirmDel(null); setDelError('') } }}>
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <Trash2 size={36} color="#dc2626" style={{ marginBottom: 12 }} />
            <div style={modal.title}>Delete User Account?</div>
            <div style={modal.sub}>
              This will permanently remove <strong>{confirmDel.name}</strong>'s account
              ({confirmDel.email}). This action cannot be undone.
            </div>
            {delError && (
              <div style={{ margin: '10px 0 0', padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>
                {delError}
              </div>
            )}
            <div style={modal.btnRow}>
              <button style={modal.cancelBtn} onClick={() => { setConfirmDel(null); setDelError('') }} disabled={deleting}>
                Cancel
              </button>
              <button
                style={{ ...modal.dangerBtn, opacity: deleting ? 0.7 : 1, cursor: deleting ? 'not-allowed' : 'pointer' }}
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true)
                  setDelError('')
                  try {
                    await removeUser(confirmDel.id)
                    setConfirmDel(null)
                  } catch (err) {
                    setDelError(err?.message || 'Delete failed. Please try again.')
                  } finally {
                    setDeleting(false)
                  }
                }}
              >
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ── SHIPMENTS TAB ────────────────────────────────────────────── */
function ShipmentsTab({ shipments, users, disruptions }) {
  const navigate = useNavigate()
  const [search,     setSearch]     = useState('')
  const [modeFilter, setModeFilter] = useState('all')
  const [statFilter, setStatFilter] = useState('all')

  const filtered = shipments.filter(s => {
    const q = search.toLowerCase()
    const matchQ = !q || s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || s.origin?.city.toLowerCase().includes(q) || s.destination?.city.toLowerCase().includes(q)
    const matchM = modeFilter === 'all' || s.mode === modeFilter
    const matchS = statFilter === 'all' || s.status === statFilter
    return matchQ && matchM && matchS
  })

  const statusColors = { on_time: '#16a34a', at_risk: '#d97706', disrupted: '#dc2626', delivered: '#64748b' }
  const statusLabels = { on_time: 'On Time', at_risk: 'At Risk', disrupted: 'Disrupted', delivered: 'Delivered' }

  return (
    <div style={st.wrap}>
      <div style={st.toolbar}>
        <div style={st.searchWrap}>
          <Search size={14} color="#94a3b8" />
          <input style={st.searchInput} placeholder="Search shipments…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select style={st.filter} value={modeFilter} onChange={e => setModeFilter(e.target.value)}>
          <option value="all">All Modes</option>
          {Object.entries(MODE_ICON).map(([k, v]) => <option key={k} value={k}>{v} {k}</option>)}
        </select>
        <select style={st.filter} value={statFilter} onChange={e => setStatFilter(e.target.value)}>
          <option value="all">All Status</option>
          {Object.keys(statusColors).map(k => <option key={k} value={k}>{statusLabels[k]}</option>)}
        </select>
        <button style={st.newBtn} onClick={() => navigate('/manager/new-transport')}>
          <Plus size={13} /> New Transport
        </button>
        <div style={st.count}>{filtered.length} shipments</div>
      </div>

      <div style={st.tableWrap}>
        <table style={st.table}>
          <thead>
            <tr style={st.thead}>
              {['ID', 'Name', 'Mode', 'Route', 'Operator', 'Progress', 'Status', 'Value', 'ETA'].map(h => (
                <th key={h} style={st.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(ship => {
              const op   = users.find(u => u.id === ship.operatorId)
              const dis  = disruptions.find(d => d.id === ship.disruptionId)
              const sc   = statusColors[ship.status] || '#64748b'
              const creator = users.find(u => u.id === ship.createdBy)
              return (
                <tr key={ship.id} style={st.tr}>
                  <td style={st.td}><span style={st.shipId}>{ship.id}</span></td>
                  <td style={st.td}>
                    <div style={st.shipName}>{ship.name}</div>
                    <div style={st.shipMeta}>{ship.cargo}</div>
                    {creator && <div style={st.shipMeta}>By: {creator.name}</div>}
                  </td>
                  <td style={st.td}><span style={st.modeIcon}>{MODE_ICON[ship.mode] || '?'}</span></td>
                  <td style={st.td}>
                    <div style={st.routeText}>{ship.origin?.city} → {ship.destination?.city}</div>
                    <div style={st.shipMeta}>{ship.carrier}</div>
                  </td>
                  <td style={st.td}>
                    {op
                      ? <div><div style={st.opName}>{op.name}</div><div style={st.shipMeta}>{op.operatorType}</div></div>
                      : <span style={st.unassigned}>Unassigned</span>
                    }
                  </td>
                  <td style={st.td}>
                    <div style={st.progBg}><div style={{ ...st.progFill, width: `${ship.progress}%`, background: sc }} /></div>
                    <div style={{ ...st.shipMeta, color: sc }}>{ship.progress}%</div>
                  </td>
                  <td style={st.td}>
                    <span style={{ ...st.statusBadge, background: sc + '20', color: sc }}>
                      {dis && '⚠ '}{statusLabels[ship.status] || ship.status}
                    </span>
                  </td>
                  <td style={st.td}><span style={st.value}>${(ship.value || 0).toLocaleString()}</span></td>
                  <td style={st.td}><span style={st.eta}>{ship.eta || '—'}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <Empty label="No shipments match your filters" />}
      </div>
    </div>
  )
}

/* ── HUBS (BASE CITIES) TAB ───────────────────────────────────── */
function HubsTab({ baseCities, addHub, removeHub }) {
  const [search,     setSearch]    = useState('')
  const [addSearch,  setAddSearch] = useState('')
  const [showAdd,    setShowAdd]   = useState(false)

  const activeNames = new Set(baseCities.map(c => c.city))
  const available   = CITIES.filter(c =>
    !activeNames.has(c.city) &&
    (!addSearch || c.city.toLowerCase().includes(addSearch.toLowerCase()) || c.country.toLowerCase().includes(addSearch.toLowerCase()))
  )

  const filtered = baseCities.filter(c =>
    !search || c.city.toLowerCase().includes(search.toLowerCase()) || c.country.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={hb.wrap}>
      <div style={hb.header}>
        <div>
          <div style={hb.title}>Active Logistics Hubs</div>
          <div style={hb.sub}>These cities are available as departure and destination options in New Transport.</div>
        </div>
        <button style={hb.addBtn} onClick={() => setShowAdd(true)}>
          <Plus size={14} /> Add Hub
        </button>
      </div>

      <div style={hb.searchWrap}>
        <Search size={14} color="#94a3b8" />
        <input style={hb.searchInput} placeholder="Filter active hubs…" value={search} onChange={e => setSearch(e.target.value)} />
        <span style={hb.countBadge}>{baseCities.length} active</span>
      </div>

      <div style={hb.grid}>
        {filtered.map(city => (
          <div key={city.city} style={hb.cityCard}>
            <div style={hb.cityInfo}>
              <Globe size={16} color="#0891b2" style={{ flexShrink: 0 }} />
              <div>
                <div style={hb.cityName}>{city.city}</div>
                <div style={hb.cityCountry}>{city.country}</div>
                <div style={hb.cityCoords}>{city.lat?.toFixed(2)}°, {city.lng?.toFixed(2)}°</div>
              </div>
            </div>
            <button style={hb.removeBtn} onClick={() => removeHub(city.city)} title="Remove hub">
              <X size={14} />
            </button>
          </div>
        ))}
        {filtered.length === 0 && <Empty label="No hubs match your search" />}
      </div>

      {/* Add Hub modal */}
      {showAdd && (
        <Modal onClose={() => setShowAdd(false)} title="Add Logistics Hub">
          <input
            style={hb.modalSearch} placeholder="Search cities…"
            value={addSearch} onChange={e => setAddSearch(e.target.value)}
            autoFocus
          />
          <div style={hb.modalList}>
            {available.slice(0, 20).map(city => (
              <div key={city.city} style={hb.modalCityRow}>
                <div>
                  <span style={hb.modalCityName}>{city.city}</span>
                  <span style={hb.modalCityCountry}> · {city.country}</span>
                </div>
                <button style={hb.modalAddBtn} onClick={() => { addHub(city); setShowAdd(false); setAddSearch('') }}>
                  <Plus size={12} /> Add
                </button>
              </div>
            ))}
            {available.length === 0 && <div style={hb.modalEmpty}>All cities are already added, or no match found.</div>}
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ── CONFIG TAB (Cargo Types) ─────────────────────────────────── */
function ConfigTab({ cargoTypes, addCargo, removeCargo }) {
  const [newType, setNewType] = useState('')
  const [error,   setError]   = useState('')

  const handleAdd = () => {
    const val = newType.trim()
    if (!val) { setError('Please enter a cargo type name.'); return }
    if (cargoTypes.includes(val)) { setError('This cargo type already exists.'); return }
    addCargo(val)
    setNewType('')
    setError('')
  }

  return (
    <div style={cf.wrap}>
      <div style={cf.section}>
        <div style={cf.sectionTitle}>Cargo Types</div>
        <div style={cf.sectionSub}>
          These cargo type options appear in the New Transport form. Add or remove types as your business requires.
        </div>

        {/* Add new */}
        <div style={cf.addRow}>
          <input
            style={cf.addInput} placeholder="New cargo type name…"
            value={newType} onChange={e => { setNewType(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button style={cf.addBtn} onClick={handleAdd}><Plus size={14} /> Add</button>
        </div>
        {error && <div style={cf.error}><AlertTriangle size={12} /> {error}</div>}

        {/* List */}
        <div style={cf.tagGrid}>
          {cargoTypes.map(type => (
            <div key={type} style={cf.tag}>
              <span style={cf.tagText}>{type}</span>
              <button style={cf.tagDel} onClick={() => removeCargo(type)} title="Remove">
                <X size={11} />
              </button>
            </div>
          ))}
          {cargoTypes.length === 0 && <Empty label="No cargo types defined" />}
        </div>
      </div>
    </div>
  )
}

/* ── ACTIVITY LOG TAB ─────────────────────────────────────────── */
function LogTab({ activityLog }) {
  const [search,      setSearch]      = useState('')
  const [roleFilter,  setRoleFilter]  = useState('all')
  const [actionFilter,setActionFilter]= useState('all')

  const filtered = activityLog.filter(log => {
    const q = search.toLowerCase()
    const matchQ = !q || log.details?.toLowerCase().includes(q) || log.userName?.toLowerCase().includes(q)
    const matchR = roleFilter   === 'all' || log.role   === roleFilter
    const matchA = actionFilter === 'all' || log.action === actionFilter
    return matchQ && matchR && matchA
  })

  const uniqueActions = [...new Set(activityLog.map(l => l.action))]

  return (
    <div style={lg.wrap}>
      <div style={lg.toolbar}>
        <div style={lg.searchWrap}>
          <Search size={14} color="#94a3b8" />
          <input style={lg.searchInput} placeholder="Search activity…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select style={lg.filter} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="operator">Operator</option>
          <option value="system">System</option>
        </select>
        <select style={lg.filter} value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
          <option value="all">All Actions</option>
          {uniqueActions.map(a => <option key={a} value={a}>{ACTION_LABEL[a] || a}</option>)}
        </select>
        <div style={lg.count}>{filtered.length} entries</div>
      </div>

      <div style={lg.list}>
        {filtered.map(log => <LogRow key={log.id} log={log} full />)}
        {filtered.length === 0 && <Empty label="No log entries match your filters" />}
      </div>
    </div>
  )
}

/* ── SHARED SUB-COMPONENTS ────────────────────────────────────── */

function LogRow({ log, full }) {
  const color = ACTION_COLOR[log.action] || '#64748b'
  const ts    = new Date(log.timestamp)
  return (
    <div style={lr.row}>
      <div style={{ ...lr.dot, background: color + '20', color }}>
        <Activity size={11} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={lr.details}>{log.details}</div>
        <div style={lr.meta}>
          <span style={{ ...lr.actBadge, background: color + '15', color }}>{ACTION_LABEL[log.action] || log.action}</span>
          {full && <span style={{ ...lr.roleBadge, background: ROLE_BG[log.role], color: ROLE_COLOR[log.role] }}>{log.userName}</span>}
          <span style={lr.time}>{ts.toLocaleDateString()} {ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    </div>
  )
}

function MetaTag({ label, value, highlight, color }) {
  return (
    <div style={mt.wrap}>
      <span style={mt.label}>{label}:</span>
      <span style={{ ...mt.value, color: color || (highlight ? '#2563eb' : '#0f172a'), fontWeight: highlight ? 600 : 400 }}>{value}</span>
    </div>
  )
}

function ActionBtn({ icon, label, color, bg, onClick }) {
  return (
    <button style={{ ...ab.btn, background: bg, color, borderColor: color + '40' }} onClick={onClick}>
      {icon} {label}
    </button>
  )
}

function Modal({ children, onClose, title }) {
  return (
    <div style={md.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={md.box}>
        <div style={md.header}>
          {title && <div style={md.title}>{title}</div>}
          <button style={md.closeBtn} onClick={onClose}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Empty({ label }) {
  return <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>{label}</div>
}

/* ──────────────────────────────────────────────────────────────
   STYLES
────────────────────────────────────────────────────────────── */

const g = {
  root:       { display: 'flex', flexDirection: 'column', height: '100vh', background: '#f1f5f9', overflow: 'hidden', fontFamily: 'Inter, system-ui, sans-serif' },
  topBar:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'linear-gradient(135deg,#1e1b4b,#312e81)', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' },
  brand:      { display: 'flex', alignItems: 'center', gap: 10 },
  logoWrap:   { width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  brandName:  { fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' },
  adminBadge: { fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.15)', color: '#c7d2fe', border: '1px solid rgba(255,255,255,0.2)' },
  topRight:   { display: 'flex', alignItems: 'center', gap: 8 },
  chatBtn:    { display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, background: 'rgba(255,255,255,0.15)', color: '#e0e7ff', border: '1px solid rgba(255,255,255,0.2)', fontSize: 12, cursor: 'pointer' },
  refreshBtn: { display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, background: 'rgba(255,255,255,0.1)', color: '#c7d2fe', border: '1px solid rgba(255,255,255,0.15)', fontSize: 12, cursor: 'pointer' },
  avatar:     { width: 30, height: 30, borderRadius: '50%', background: '#4f46e5', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  userName:   { fontSize: 13, fontWeight: 600, color: '#e0e7ff' },
  logoutBtn:  { display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, background: 'rgba(255,255,255,0.08)', color: '#c7d2fe', border: '1px solid rgba(255,255,255,0.12)', fontSize: 12, cursor: 'pointer' },
  tabBar:     { display: 'flex', background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 8px', flexShrink: 0, overflowX: 'auto', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  tabBtn:     { display: 'flex', alignItems: 'center', gap: 6, padding: '12px 16px', background: 'none', border: 'none', borderBottom: '2px solid transparent', fontSize: 13, fontWeight: 500, color: '#64748b', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' },
  tabActive:  { color: '#4f46e5', borderBottomColor: '#4f46e5', fontWeight: 700 },
  content:    { flex: 1, overflowY: 'auto', padding: '16px' },
  geminiFab:  { position: 'fixed', bottom: 24, right: 24, width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#2563eb)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(124,58,237,0.45)', zIndex: 200, transition: 'transform 0.2s' },
}

const ov = {
  wrap:      { display: 'flex', flexDirection: 'column', gap: 16 },
  kpiGrid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 },
  kpiCard:   { borderRadius: 12, padding: '14px', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: 4 },
  kpiIcon:   { width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  kpiVal:    { fontSize: 24, fontWeight: 800, lineHeight: 1 },
  kpiLbl:    { fontSize: 11, color: '#64748b', fontWeight: 500 },
  row:       { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  card:      { background: '#fff', borderRadius: 14, padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  cardTitle: { fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 12 },
  barRow:    { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  barLabel:  { fontSize: 12, color: '#475569', width: 80, flexShrink: 0 },
  barBg:     { flex: 1, height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' },
  barFill:   { height: '100%', borderRadius: 4, transition: 'width 0.4s' },
  barCount:  { fontSize: 12, fontWeight: 700, width: 20, textAlign: 'right' },
}

const ut = {
  wrap:        { display: 'flex', flexDirection: 'column', gap: 14 },
  toolbar:     { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', background: '#fff', padding: '12px', borderRadius: 12, border: '1px solid #e2e8f0' },
  searchWrap:  { display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200, background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '7px 10px' },
  searchInput: { border: 'none', background: 'none', outline: 'none', fontSize: 13, color: '#0f172a', flex: 1 },
  filter:      { padding: '7px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#475569', background: '#f8fafc' },
  count:       { fontSize: 12, color: '#94a3b8', fontWeight: 500, whiteSpace: 'nowrap' },
  grid:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 },
  card:        { background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: 10 },
  cardTop:     { display: 'flex', alignItems: 'center', gap: 10 },
  avatar:      { width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0, border: '2px solid rgba(0,0,0,0.06)' },
  name:        { fontSize: 14, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 },
  email:       { fontSize: 11, color: '#64748b', marginTop: 1 },
  roleBadge:   { fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, textTransform: 'capitalize', flexShrink: 0 },
  meTag:       { fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 20, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' },
  meta:        { display: 'flex', flexWrap: 'wrap', gap: 6 },
  actions:      { display: 'flex', gap: 8, paddingTop: 4, borderTop: '1px solid #f1f5f9', flexWrap: 'wrap' },
  protectedRow: { display: 'flex', alignItems: 'center', gap: 6, paddingTop: 6, borderTop: '1px solid #f1f5f9' },
  protectedLabel:{ fontSize: 11, color: '#7c3aed', fontWeight: 600 },
}

const st = {
  wrap:       { display: 'flex', flexDirection: 'column', gap: 14 },
  toolbar:    { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', background: '#fff', padding: '12px', borderRadius: 12, border: '1px solid #e2e8f0' },
  newBtn:     { display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' },
  searchWrap: { display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200, background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '7px 10px' },
  searchInput:{ border: 'none', background: 'none', outline: 'none', fontSize: 13, color: '#0f172a', flex: 1 },
  filter:     { padding: '7px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#475569', background: '#f8fafc' },
  count:      { fontSize: 12, color: '#94a3b8', fontWeight: 500 },
  tableWrap:  { background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'auto', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  table:      { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  thead:      { background: '#f8fafc' },
  th:         { padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' },
  tr:         { borderBottom: '1px solid #f1f5f9' },
  td:         { padding: '10px 12px', verticalAlign: 'middle' },
  shipId:     { fontSize: 10, fontWeight: 700, color: '#94a3b8', fontFamily: 'monospace' },
  shipName:   { fontSize: 12, fontWeight: 600, color: '#0f172a' },
  shipMeta:   { fontSize: 10, color: '#94a3b8', marginTop: 2 },
  modeIcon:   { fontSize: 18 },
  routeText:  { fontSize: 12, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' },
  opName:     { fontSize: 12, fontWeight: 600, color: '#0f172a' },
  unassigned: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' },
  progBg:     { height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden', marginBottom: 3 },
  progFill:   { height: '100%', borderRadius: 3 },
  statusBadge:{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 },
  value:      { fontSize: 12, fontWeight: 700, color: '#0f172a' },
  eta:        { fontSize: 11, color: '#64748b' },
}

const hb = {
  wrap:          { display: 'flex', flexDirection: 'column', gap: 14 },
  header:        { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  title:         { fontSize: 15, fontWeight: 700, color: '#0f172a' },
  sub:           { fontSize: 12, color: '#64748b', marginTop: 4, lineHeight: 1.5 },
  addBtn:        { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, background: '#0891b2', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 },
  searchWrap:    { display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 9, padding: '8px 12px' },
  searchInput:   { border: 'none', background: 'none', outline: 'none', fontSize: 13, color: '#0f172a', flex: 1 },
  countBadge:    { fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#ecfeff', color: '#0891b2', border: '1px solid #a5f3fc', whiteSpace: 'nowrap' },
  grid:          { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 },
  cityCard:      { background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  cityInfo:      { display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1, minWidth: 0 },
  cityName:      { fontSize: 13, fontWeight: 700, color: '#0f172a' },
  cityCountry:   { fontSize: 11, color: '#64748b', marginTop: 1 },
  cityCoords:    { fontSize: 10, color: '#94a3b8', marginTop: 2, fontFamily: 'monospace' },
  removeBtn:     { width: 28, height: 28, borderRadius: 7, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  modalSearch:   { width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: 13, color: '#0f172a', background: '#f8fafc', marginBottom: 10, boxSizing: 'border-box' },
  modalList:     { maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 },
  modalCityRow:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 8, border: '1px solid #f1f5f9', background: '#fafbfc' },
  modalCityName: { fontSize: 13, fontWeight: 600, color: '#0f172a' },
  modalCityCountry:{ fontSize: 11, color: '#64748b' },
  modalAddBtn:   { display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, background: '#0891b2', color: '#fff', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0 },
  modalEmpty:    { padding: '20px', textAlign: 'center', fontSize: 12, color: '#94a3b8' },
}

const cf = {
  wrap:         { maxWidth: 640 },
  section:      { background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4 },
  sectionSub:   { fontSize: 12, color: '#64748b', marginBottom: 16, lineHeight: 1.5 },
  addRow:       { display: 'flex', gap: 8, marginBottom: 8 },
  addInput:     { flex: 1, padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: 13, color: '#0f172a', background: '#f8fafc' },
  addBtn:       { display: 'flex', alignItems: 'center', gap: 5, padding: '9px 16px', borderRadius: 9, background: '#0891b2', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 },
  error:        { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#dc2626', marginBottom: 10 },
  tagGrid:      { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  tag:          { display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px 5px 12px', borderRadius: 20, background: '#f1f5f9', border: '1px solid #e2e8f0' },
  tagText:      { fontSize: 12, fontWeight: 500, color: '#475569' },
  tagDel:       { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: '50%', background: '#e2e8f0', color: '#64748b', border: 'none', cursor: 'pointer', padding: 0 },
}

const lg = {
  wrap:       { display: 'flex', flexDirection: 'column', gap: 14 },
  toolbar:    { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', background: '#fff', padding: '12px', borderRadius: 12, border: '1px solid #e2e8f0' },
  searchWrap: { display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200, background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '7px 10px' },
  searchInput:{ border: 'none', background: 'none', outline: 'none', fontSize: 13, color: '#0f172a', flex: 1 },
  filter:     { padding: '7px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#475569', background: '#f8fafc' },
  count:      { fontSize: 12, color: '#94a3b8', fontWeight: 500 },
  list:       { background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
}

const lr = {
  row:      { display: 'flex', gap: 12, padding: '10px 14px', borderBottom: '1px solid #f8fafc', alignItems: 'flex-start' },
  dot:      { width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  details:  { fontSize: 12, color: '#0f172a', lineHeight: 1.45, marginBottom: 4 },
  meta:     { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' },
  actBadge: { fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 20 },
  roleBadge:{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 20 },
  time:     { fontSize: 10, color: '#94a3b8' },
}

const mt = {
  wrap:  { display: 'flex', alignItems: 'center', gap: 4, background: '#f8fafc', borderRadius: 6, padding: '3px 8px', border: '1px solid #f1f5f9' },
  label: { fontSize: 10, color: '#94a3b8', fontWeight: 500 },
  value: { fontSize: 11, color: '#0f172a' },
}

const ab = {
  btn: { display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, border: '1px solid', fontSize: 11, fontWeight: 600, cursor: 'pointer', flex: 1, justifyContent: 'center' },
}

const md = {
  overlay:  { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  box:      { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' },
  header:   { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '12px 16px 0' },
  title:    { fontSize: 15, fontWeight: 700, color: '#0f172a' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' },
}

const modal = {
  title:     { fontSize: 17, fontWeight: 800, color: '#0f172a', marginBottom: 8 },
  sub:       { fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 4 },
  btnRow:    { display: 'flex', gap: 10, marginTop: 20, justifyContent: 'center' },
  cancelBtn: { padding: '10px 22px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  dangerBtn: { padding: '10px 22px', borderRadius: 9, border: 'none', background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
}
