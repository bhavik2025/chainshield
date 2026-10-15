import { useApp } from '../context/AppContext'
import { STATUS_CONFIG, MODE_CONFIG } from '../data/mockData'
import { Search, Filter } from 'lucide-react'
import { useState } from 'react'

export default function ShipmentList({ onOpenAlert }) {
  const { filteredShipments, selectedShipment, selectShipment,
          modeFilter, setModeFilter, statusFilter, setStatusFilter, disruptions } = useApp()
  const [search, setSearch] = useState('')

  const searched = filteredShipments.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.id.toLowerCase().includes(search.toLowerCase()) ||
    s.origin.city.toLowerCase().includes(search.toLowerCase()) ||
    s.destination.city.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={s.panel}>
      {/* Search */}
      <div style={s.searchWrap}>
        <Search size={14} color="#94a3b8" style={s.searchIcon} />
        <input
          style={s.searchInput}
          placeholder="Search shipments..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Mode filter */}
      <div style={s.filters}>
        <div style={s.filterRow}>
          {['all','sea','air','road','rail'].map(m => (
            <button
              key={m}
              style={{
                ...s.filterChip,
                background: modeFilter === m ? '#2563eb' : '#f1f5f9',
                color:      modeFilter === m ? '#fff'    : '#475569',
              }}
              onClick={() => setModeFilter(m)}
            >
              {m === 'all' ? 'All' : `${MODE_CONFIG[m].icon} ${MODE_CONFIG[m].label}`}
            </button>
          ))}
        </div>
        <div style={s.filterRow}>
          {['all','on_time','at_risk','delayed','disrupted','delivered'].map(st => {
            const colMap = { on_time:'#16a34a', at_risk:'#d97706', delayed:'#ea580c', disrupted:'#dc2626', delivered:'#0891b2' }
            return (
              <button
                key={st}
                style={{
                  ...s.filterChip,
                  background: statusFilter === st ? (colMap[st] || '#2563eb') : '#f1f5f9',
                  color: statusFilter === st ? '#fff' : '#475569',
                }}
                onClick={() => setStatusFilter(st)}
              >
                {st === 'all' ? 'All' : STATUS_CONFIG[st]?.label || st}
              </button>
            )
          })}
        </div>
      </div>

      {/* Count */}
      <div style={s.count}>{searched.length} shipment{searched.length !== 1 ? 's' : ''}</div>

      {/* List */}
      <div style={s.list}>
        {searched.length === 0 && (
          <div style={s.empty}>No shipments match your filters</div>
        )}
        {searched.map(ship => {
          const stCfg   = STATUS_CONFIG[ship.status]
          const modeCfg = MODE_CONFIG[ship.mode]
          const isSelected = selectedShipment?.id === ship.id
          const disruption = disruptions.find(d => d.id === ship.disruptionId)

          return (
            <div
              key={ship.id}
              style={{
                ...s.item,
                background:  isSelected ? '#eff6ff' : '#fff',
                borderColor: isSelected ? '#bfdbfe' : '#e2e8f0',
                borderLeft:  `3px solid ${stCfg.dot}`,
              }}
              onClick={() => selectShipment(ship)}
            >
              <div style={s.itemTop}>
                <span style={s.modeIcon}>{modeCfg.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={s.itemId}>{ship.id}</div>
                  <div style={s.itemName}>{ship.name}</div>
                </div>
                <span style={{ ...s.statusDot, background: stCfg.dot }} />
              </div>

              <div style={s.itemRoute}>
                {ship.origin.city} → {ship.destination.city}
              </div>

              {ship.riskScore > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <div style={{
                    height: 4, flex: 1, borderRadius: 2, background: '#e2e8f0', overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', borderRadius: 2,
                      width: `${ship.riskScore}%`,
                      background: ship.riskScore >= 70 ? '#dc2626' : ship.riskScore >= 40 ? '#d97706' : '#16a34a',
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
                    color: ship.riskScore >= 70 ? '#dc2626' : ship.riskScore >= 40 ? '#d97706' : '#16a34a',
                  }}>
                    {ship.riskScore >= 70 ? '🔴' : ship.riskScore >= 40 ? '🟡' : '🟢'} {ship.riskScore}/100
                  </span>
                </div>
              )}

              <div style={s.itemBottom}>
                <div style={s.progressWrap}>
                  <div style={s.progressBar}>
                    <div style={{ ...s.progressFill, width: `${ship.progress}%`, background: stCfg.dot }} />
                  </div>
                  <span style={s.progressLabel}>{ship.progress}%</span>
                </div>
                <span style={s.etaLabel}>ETA {ship.eta}</span>
              </div>

              {disruption && (
                <button
                  style={s.alertBtn}
                  onClick={e => { e.stopPropagation(); onOpenAlert(disruption) }}
                >
                  ⚠ View Alert
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const s = {
  panel: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' },
  searchWrap: {
    position: 'relative', padding: '10px 12px 0',
  },
  searchIcon: { position: 'absolute', left: 22, top: '50%', transform: 'translateY(-2px)' },
  searchInput: {
    width: '100%', padding: '8px 10px 8px 32px',
    border: '1.5px solid #e2e8f0', borderRadius: 8,
    fontSize: 13, color: '#0f172a', background: '#f8fafc',
    transition: 'border-color 0.15s',
  },
  filters: { padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 },
  filterRow: { display: 'flex', gap: 5, flexWrap: 'wrap' },
  filterChip: {
    padding: '4px 10px', borderRadius: 20, border: 'none',
    fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
  },
  count: { padding: '4px 14px', fontSize: 11, color: '#94a3b8', borderBottom: '1px solid #f1f5f9' },
  list: { flex: 1, overflowY: 'auto', padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 6 },
  empty: { padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: 13 },
  item: {
    padding: '10px 12px', borderRadius: 10, border: '1.5px solid',
    cursor: 'pointer', transition: 'all 0.15s',
  },
  itemTop: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 },
  modeIcon: { fontSize: 18, flexShrink: 0 },
  itemId:   { fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' },
  itemName: { fontSize: 13, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  statusDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  itemRoute: { fontSize: 11, color: '#64748b', marginBottom: 6 },
  itemBottom: { display: 'flex', alignItems: 'center', gap: 8 },
  progressWrap: { flex: 1, display: 'flex', alignItems: 'center', gap: 5 },
  progressBar:  { flex: 1, height: 3, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2, transition: 'width 0.3s' },
  progressLabel: { fontSize: 10, color: '#94a3b8', flexShrink: 0 },
  etaLabel: { fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap' },
  alertBtn: {
    marginTop: 7, width: '100%', padding: '5px', borderRadius: 6,
    background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
    fontSize: 11, fontWeight: 600, cursor: 'pointer',
  },
}
