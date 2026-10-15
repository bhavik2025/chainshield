import { useState } from 'react'
import { useApp }  from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { DISRUPTION_TYPE_CONFIG, SEVERITY_CONFIG } from '../data/mockData'
import { X, AlertTriangle, CheckCircle, Loader, Eye, Lock } from 'lucide-react'

export default function AlertModal() {
  const { alertModal, closeAlertModal, resolveSolution } = useApp()
  const { currentUser } = useAuth()
  const isOperator = currentUser?.role === 'operator'

  const [step,       setStep]       = useState('alert')  // 'alert' | 'solutions' | 'confirming'
  const [selectedSol, setSelectedSol] = useState(null)
  const [notifState,  setNotifState]  = useState(null)    // null | 'sending' | 'sent'

  if (!alertModal) return null

  const dis     = alertModal
  const typeCfg = DISRUPTION_TYPE_CONFIG[dis.type]    || DISRUPTION_TYPE_CONFIG.weather
  const sevCfg  = SEVERITY_CONFIG[dis.severity]       || SEVERITY_CONFIG.medium

  const handleSelect = (sol) => {
    if (isOperator) return           // operators cannot select
    setSelectedSol(sol)
    setStep('confirming')
  }

  const handleConfirm = () => {
    setNotifState('sending')
    setTimeout(() => {
      setNotifState('sent')
      setTimeout(() => {
        resolveSolution(dis.id, selectedSol.id)
        setStep('alert'); setSelectedSol(null); setNotifState(null)
      }, 1800)
    }, 1800)
  }

  // Step labels — operators see only 2 steps
  const stepLabels = isOperator ? ['Alert', 'Solutions'] : ['Alert', 'Solutions', 'Confirm']
  const stepIdx    = step === 'alert' ? 0 : step === 'solutions' ? 1 : 2

  return (
    <div className="modal-overlay" onClick={closeAlertModal}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div style={{ ...s.header, borderBottom: `3px solid ${sevCfg.color}` }}>
          <div style={{ ...s.headerIcon, background: sevCfg.color + '18' }}>
            <AlertTriangle size={22} color={sevCfg.color} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={s.typeLabel}>{typeCfg.icon} {typeCfg.label} Disruption</div>
            <div style={s.title}>{dis.title}</div>
            <div style={s.detected}>Detected: {new Date(dis.detectedAt).toLocaleString()}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
            <span style={{ ...s.sevBadge, background: sevCfg.color + '18', color: sevCfg.color }}>
              {sevCfg.label}
            </span>
            <span style={s.delayBadge}>+{dis.estimatedDelayHours}h estimated delay</span>
          </div>
          <button style={s.closeBtn} onClick={closeAlertModal}><X size={18} /></button>
        </div>

        {/* ── Step indicator ── */}
        <div style={s.steps}>
          {stepLabels.map((label, i) => (
            <div key={label} style={s.stepItem}>
              <div style={{ ...s.stepDot, background: i <= stepIdx ? '#2563eb' : '#e2e8f0', color: i <= stepIdx ? '#fff' : '#94a3b8' }}>
                {i + 1}
              </div>
              <span style={{ ...s.stepLabel, color: i <= stepIdx ? '#0f172a' : '#94a3b8' }}>{label}</span>
              {i < stepLabels.length - 1 && (
                <div style={{ ...s.stepLine, background: i < stepIdx ? '#2563eb' : '#e2e8f0' }} />
              )}
            </div>
          ))}
          {isOperator && (
            <div style={s.readOnlyChip}>
              <Eye size={11} /> View Only
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div style={s.body}>

          {/* Step 1: Alert details */}
          {step === 'alert' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={s.descBox}>{dis.description}</div>

              {/* Affected shipments */}
              {dis.affectedShipments?.length > 0 && (
                <div>
                  <div style={s.sectionLabel}>Affected Shipments</div>
                  {dis.affectedShipments.map(id => (
                    <div key={id} style={s.shipRow}>
                      <span style={{ fontSize: 18 }}>📦</span>
                      <div style={{ flex: 1 }}>
                        <div style={s.shipId}>{id}</div>
                        <div style={s.shipSub}>Your shipment — route affected</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Operator info box */}
              {isOperator && (
                <div style={s.operatorInfoBox}>
                  <AlertTriangle size={14} color="#d97706" style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, color: '#92400e', marginBottom: 3 }}>Your route is affected</div>
                    <div style={{ color: '#78350f' }}>
                      Your operations manager is reviewing the situation and will select the best solution.
                      You will receive a notification once a decision is made.
                    </div>
                  </div>
                </div>
              )}

              <button
                style={isOperator ? s.viewSolBtnOperator : s.viewSolBtnManager}
                onClick={() => setStep('solutions')}
              >
                {isOperator ? <><Eye size={14} /> View Available Solutions</> : <>View Recommended Solutions →</>}
              </button>
            </div>
          )}

          {/* Step 2: Solutions */}
          {step === 'solutions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {isOperator ? (
                <div style={s.operatorSolBanner}>
                  <Lock size={14} color="#2563eb" style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Manager Decision Pending</strong>
                    <div style={{ fontSize: 12, marginTop: 2, color: '#3730a3' }}>
                      You can review the options below. Only your operations manager can select and apply a solution.
                    </div>
                  </div>
                </div>
              ) : (
                <div style={s.managerSolHint}>
                  Review all options below. We've marked the best solution as <strong>Recommended</strong>, but the final decision is yours.
                </div>
              )}

              {dis.solutions.map(sol => (
                <SolutionCard
                  key={sol.id}
                  solution={sol}
                  readOnly={isOperator}
                  onSelect={handleSelect}
                />
              ))}

              <button style={s.backBtn} onClick={() => setStep('alert')}>← Back to Alert</button>
            </div>
          )}

          {/* Step 3: Confirm (managers only) */}
          {step === 'confirming' && !isOperator && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {notifState === null && (
                <>
                  <div style={s.confirmBox}>
                    <CheckCircle size={32} color="#2563eb" />
                    <div style={s.confirmTitle}>Confirm Selection</div>
                    <div style={s.confirmDesc}>You have selected: <strong>{selectedSol.title}</strong></div>
                    <div style={s.confirmMeta}>
                      <span>+{selectedSol.extraTimeHours}h delay</span>
                      <span>+${selectedSol.extraCostUSD.toLocaleString()} cost</span>
                      <span>Risk: {selectedSol.riskScore}/100</span>
                    </div>
                    <p style={s.confirmNote}>
                      Confirming will notify all affected field operators and update the shipment status.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button style={s.backBtn} onClick={() => setStep('solutions')}>← Back</button>
                    <button style={s.confirmBtn} onClick={handleConfirm}>Confirm & Notify Operators</button>
                  </div>
                </>
              )}
              {notifState === 'sending' && (
                <div style={s.statusWrap}>
                  <Loader size={32} color="#2563eb" style={{ animation: 'spin 1s linear infinite' }} />
                  <div style={s.statusTitle}>Sending notifications…</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Updating route and notifying field operators</div>
                </div>
              )}
              {notifState === 'sent' && (
                <div style={s.statusWrap}>
                  <CheckCircle size={40} color="#16a34a" />
                  <div style={{ ...s.statusTitle, color: '#16a34a' }}>All Operators Notified!</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Shipment status is being updated…</div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

/* ── Solution card ── */
function SolutionCard({ solution, readOnly, onSelect }) {
  return (
    <div style={{
      ...ss.card,
      borderColor:  solution.recommended ? '#2563eb' : '#e2e8f0',
      background:   solution.recommended ? '#eff6ff' : '#fff',
      cursor:       readOnly ? 'default' : 'pointer',
    }}>
      {solution.recommended && (
        <div style={ss.recBadge}>⭐ Recommended</div>
      )}
      <div style={ss.title}>{solution.title}</div>
      <div style={ss.desc}>{solution.description}</div>

      <div style={ss.metrics}>
        <Metric label="Extra Time" value={solution.extraTimeHours > 0 ? `+${solution.extraTimeHours}h` : 'None'} color="#d97706" />
        <Metric label="Extra Cost" value={`+$${solution.extraCostUSD.toLocaleString()}`} color="#ea580c" />
        <Metric label="Risk Score" value={`${solution.riskScore}/100`} color={solution.riskScore < 20 ? '#16a34a' : solution.riskScore < 40 ? '#d97706' : '#dc2626'} />
      </div>

      <div style={ss.prosConsRow}>
        <div>
          <div style={ss.pcLabel}>✓ Pros</div>
          {solution.pros.map(p => <div key={p} style={ss.pcItem}>{p}</div>)}
        </div>
        <div>
          <div style={{ ...ss.pcLabel, color: '#dc2626' }}>✗ Cons</div>
          {solution.cons.map(c => <div key={c} style={ss.pcItem}>{c}</div>)}
        </div>
      </div>

      {readOnly ? (
        <div style={ss.readOnlyNote}>
          <Lock size={11} color="#94a3b8" /> Manager will select this solution if appropriate
        </div>
      ) : (
        <button
          style={{ ...ss.selectBtn, background: solution.recommended ? '#2563eb' : '#f1f5f9', color: solution.recommended ? '#fff' : '#475569' }}
          onClick={() => onSelect(solution)}
        >
          Select This Solution
        </button>
      )}
    </div>
  )
}

function Metric({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 10, color: '#94a3b8' }}>{label}</div>
    </div>
  )
}

/* ── Styles ── */
const s = {
  modal: { background: '#fff', borderRadius: 18, width: '100%', maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 48px rgba(0,0,0,0.16)', animation: 'slideUp 0.3s ease', overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'flex-start', gap: 14, padding: '18px 20px', background: '#fafbfc', flexShrink: 0 },
  headerIcon: { width: 44, height: 44, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  typeLabel: { fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 },
  title: { fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 2 },
  detected: { fontSize: 11, color: '#94a3b8' },
  sevBadge: { fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 },
  delayBadge: { fontSize: 11, color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: 20, fontWeight: 600 },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4, borderRadius: 6, flexShrink: 0 },
  steps: { display: 'flex', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid #f1f5f9', gap: 0, flexShrink: 0 },
  stepItem: { display: 'flex', alignItems: 'center', flex: 1 },
  stepDot: { width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 },
  stepLabel: { fontSize: 12, fontWeight: 600, marginLeft: 6 },
  stepLine: { flex: 1, height: 2, marginLeft: 8 },
  readOnlyChip: { display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: '#f1f5f9', color: '#64748b', borderRadius: 20, fontSize: 11, fontWeight: 600, border: '1px solid #e2e8f0', flexShrink: 0, marginLeft: 8 },
  body: { flex: 1, overflowY: 'auto', padding: '16px 20px' },
  descBox: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#475569', lineHeight: 1.6 },
  sectionLabel: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 },
  shipRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: '#f8fafc', borderRadius: 8, marginBottom: 6 },
  shipId: { fontSize: 13, fontWeight: 700, color: '#0f172a' },
  shipSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  operatorInfoBox: { display: 'flex', gap: 10, padding: '12px 14px', background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 10, fontSize: 12, color: '#78350f', lineHeight: 1.5 },
  viewSolBtnOperator: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px', borderRadius: 10, background: '#eff6ff', color: '#2563eb', border: '1.5px solid #bfdbfe', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  viewSolBtnManager: { padding: '11px', borderRadius: 10, background: '#2563eb', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', width: '100%' },
  operatorSolBanner: { display: 'flex', gap: 10, padding: '12px 14px', background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 10, fontSize: 13, color: '#1e40af', lineHeight: 1.5 },
  managerSolHint: { fontSize: 13, color: '#64748b', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 12px', lineHeight: 1.5 },
  backBtn: { padding: '10px 18px', borderRadius: 10, background: '#f1f5f9', color: '#475569', border: '1.5px solid #e2e8f0', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  confirmBtn: { flex: 1, padding: '10px 18px', borderRadius: 10, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  confirmBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '24px', background: '#f8fafc', borderRadius: 14, border: '1px solid #e2e8f0', textAlign: 'center' },
  confirmTitle: { fontSize: 18, fontWeight: 800, color: '#0f172a' },
  confirmDesc:  { fontSize: 14, color: '#475569' },
  confirmMeta:  { display: 'flex', gap: 16, fontSize: 12, color: '#64748b', flexWrap: 'wrap', justifyContent: 'center' },
  confirmNote:  { fontSize: 12, color: '#94a3b8', maxWidth: 400, lineHeight: 1.5, margin: 0 },
  statusWrap:   { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '40px 0', textAlign: 'center' },
  statusTitle:  { fontSize: 17, fontWeight: 800, color: '#0f172a' },
}

const ss = {
  card: { border: '2px solid', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 },
  recBadge: { fontSize: 11, fontWeight: 700, color: '#2563eb', background: '#dbeafe', padding: '3px 10px', borderRadius: 20, alignSelf: 'flex-start' },
  title: { fontSize: 14, fontWeight: 700, color: '#0f172a' },
  desc:  { fontSize: 12, color: '#64748b', lineHeight: 1.5 },
  metrics: { display: 'flex', gap: 4, padding: '10px 0', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' },
  prosConsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  pcLabel: { fontSize: 10, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 },
  pcItem:  { fontSize: 11, color: '#475569', lineHeight: 1.4 },
  selectBtn: { padding: '9px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.15s' },
  readOnlyNote: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#94a3b8', fontStyle: 'italic', padding: '6px 0 2px' },
}
