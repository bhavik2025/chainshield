/**
 * ChatModal — Direct messaging via 5-digit chat numbers.
 *
 * Props:
 *   onClose  () => void
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../utils/api'
import {
  MessageSquare, X, Send, Search, Inbox,
  Edit3, ChevronRight, RefreshCw, Check, CheckCheck,
  Hash, User, ArrowLeft,
} from 'lucide-react'

export default function ChatModal({ onClose }) {
  const { currentUser } = useAuth()

  // tab: 'inbox' | 'compose'
  const [tab,      setTab]      = useState('inbox')
  const [messages, setMessages] = useState([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  // Compose state
  const [searchQ,      setSearchQ]      = useState('')
  const [searchResults,setSearchResults]= useState([])
  const [searching,    setSearching]    = useState(false)
  const [recipient,    setRecipient]    = useState(null)   // selected ChatUserOut
  const [msgContent,   setMsgContent]   = useState('')
  const [sending,      setSending]      = useState(false)
  const [sent,         setSent]         = useState(false)

  // Thread view (inbox)
  const [thread, setThread] = useState(null)  // { partnerId, partnerName, partnerNum }

  const searchTimer = useRef(null)

  // ── Load inbox ────────────────────────────────────────────────
  const loadInbox = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.chat.inbox()
      setMessages(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'inbox') loadInbox()
  }, [tab, loadInbox])

  // ── Search with debounce ──────────────────────────────────────
  const handleSearchChange = (val) => {
    setSearchQ(val)
    setSearchResults([])
    setRecipient(null)
    clearTimeout(searchTimer.current)
    if (!val.trim()) return
    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await api.chat.search(val.trim())
        setSearchResults(res)
      } catch {}
      setSearching(false)
    }, 350)
  }

  // ── Send message ──────────────────────────────────────────────
  const handleSend = async () => {
    if (!recipient || !msgContent.trim()) return
    setSending(true)
    setError('')
    try {
      await api.chat.send(recipient.chat_number, msgContent.trim())
      setSent(true)
      setMsgContent('')
      setTimeout(() => { setSent(false); setTab('inbox') }, 1200)
    } catch (e) {
      setError(e.message)
    } finally {
      setSending(false)
    }
  }

  // ── Mark message read ─────────────────────────────────────────
  const markRead = async (msgId) => {
    try {
      await api.chat.markRead(msgId)
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, read: true } : m))
    } catch {}
  }

  // ── Build conversation threads from flat message list ─────────
  const getThreads = () => {
    const map = {}
    messages.forEach(m => {
      const isMine = m.sender_id === currentUser?.id
      const partnerId  = isMine ? m.receiver_id : m.sender_id
      const partnerNum = isMine ? null : m.sender_chat_number
      const partnerName= isMine ? '(You → recipient)' : m.sender_name

      if (!map[partnerId]) {
        map[partnerId] = {
          partnerId,
          partnerName: isMine ? null : partnerName,
          partnerNum,
          messages: [],
          unread: 0,
        }
      }
      if (isMine) {
        // Fill partner name from the other side if we have it
        if (!map[partnerId].partnerName) {
          // We don't have the receiver's name here easily,
          // but we'll get it from received messages in the same thread
        }
      } else {
        map[partnerId].partnerName = m.sender_name
        map[partnerId].partnerNum  = m.sender_chat_number
      }
      map[partnerId].messages.push(m)
      if (!m.read && !isMine) map[partnerId].unread++
    })
    return Object.values(map).sort((a, b) => {
      const aLast = a.messages[0]?.created_at || 0
      const bLast = b.messages[0]?.created_at || 0
      return bLast > aLast ? 1 : -1
    })
  }

  const threads = getThreads()

  // Thread messages (newest first → we reverse for display)
  const threadMessages = thread
    ? messages
        .filter(m => m.sender_id === thread.partnerId || m.receiver_id === thread.partnerId)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    : []

  // Mark unread messages in thread as read when thread opens
  useEffect(() => {
    if (!thread) return
    threadMessages.forEach(m => {
      if (!m.read && m.sender_id === thread.partnerId) markRead(m.id)
    })
  }, [thread])

  const fmt = (iso) => {
    const d = new Date(iso)
    const now = new Date()
    const sameDay = d.toDateString() === now.toDateString()
    if (sameDay) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
           d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const totalUnread = messages.filter(m => !m.read && m.sender_id !== currentUser?.id).length

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>

        {/* ── Header ── */}
        <div style={s.header}>
          <div style={s.headerLeft}>
            <div style={s.headerIcon}><MessageSquare size={16} color="#fff" /></div>
            <div>
              <div style={s.headerTitle}>Direct Messages</div>
              {currentUser?.chat_number && (
                <div style={s.headerSub}>
                  <Hash size={10} />
                  Your chat ID: <strong>{currentUser.chat_number}</strong>
                </div>
              )}
            </div>
          </div>
          <button style={s.closeBtn} onClick={onClose}><X size={16} /></button>
        </div>

        {/* ── Tabs ── */}
        <div style={s.tabs}>
          <button
            style={{ ...s.tab, ...(tab === 'inbox' ? s.tabActive : {}) }}
            onClick={() => { setTab('inbox'); setThread(null) }}
          >
            <Inbox size={13} />
            Inbox
            {totalUnread > 0 && <span style={s.badge}>{totalUnread}</span>}
          </button>
          <button
            style={{ ...s.tab, ...(tab === 'compose' ? s.tabActive : {}) }}
            onClick={() => { setTab('compose'); setThread(null) }}
          >
            <Edit3 size={13} />
            New Message
          </button>
        </div>

        {/* ── Body ── */}
        <div style={s.body}>

          {/* ═══════════════════ INBOX ═══════════════════ */}
          {tab === 'inbox' && !thread && (
            <>
              <div style={s.inboxToolbar}>
                <span style={s.inboxCount}>{threads.length} conversation{threads.length !== 1 ? 's' : ''}</span>
                <button style={s.refreshBtn} onClick={loadInbox} disabled={loading}>
                  <RefreshCw size={12} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
                </button>
              </div>
              {error && <ErrorBanner msg={error} />}
              {loading && <div style={s.empty}>Loading…</div>}
              {!loading && threads.length === 0 && (
                <div style={s.empty}>
                  <MessageSquare size={32} color="#cbd5e1" />
                  <div style={{ marginTop: 8 }}>No messages yet.</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                    Click "New Message" to start a conversation.
                  </div>
                </div>
              )}
              <div style={s.threadList}>
                {threads.map(t => (
                  <div
                    key={t.partnerId}
                    style={{ ...s.threadRow, background: t.unread > 0 ? '#eff6ff' : '#fff' }}
                    onClick={() => setThread(t)}
                  >
                    <div style={s.threadAvatar}>
                      {(t.partnerName || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={s.threadName}>
                        {t.partnerName || 'Unknown'}
                        {t.partnerNum && <span style={s.threadNum}>#{t.partnerNum}</span>}
                      </div>
                      <div style={s.threadPreview} title={t.messages[0]?.content}>
                        {t.messages[0]?.sender_id === currentUser?.id && <span style={{ color: '#94a3b8' }}>You: </span>}
                        {(t.messages[0]?.content || '').slice(0, 60)}{t.messages[0]?.content?.length > 60 ? '…' : ''}
                      </div>
                    </div>
                    <div style={s.threadMeta}>
                      {t.messages[0] && <span style={s.threadTime}>{fmt(t.messages[0].created_at)}</span>}
                      {t.unread > 0 && <span style={s.unreadBadge}>{t.unread}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ═══════════════════ THREAD VIEW ═══════════════════ */}
          {tab === 'inbox' && thread && (
            <div style={s.threadView}>
              <div style={s.threadHeader}>
                <button style={s.backBtn} onClick={() => setThread(null)}>
                  <ArrowLeft size={14} />
                </button>
                <div style={{ ...s.threadAvatar, width: 30, height: 30, fontSize: 11 }}>
                  {(thread.partnerName || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <div>
                  <div style={s.threadName}>{thread.partnerName || 'Unknown'}</div>
                  {thread.partnerNum && <div style={{ fontSize: 10, color: '#94a3b8' }}>#{thread.partnerNum}</div>}
                </div>
              </div>

              <div style={s.messageList}>
                {threadMessages.map(m => {
                  const isMine = m.sender_id === currentUser?.id
                  return (
                    <div key={m.id} style={{ ...s.msgWrap, justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                      <div style={{ ...s.bubble, ...(isMine ? s.bubbleMine : s.bubbleTheirs) }}>
                        <div style={s.bubbleText}>{m.content}</div>
                        <div style={s.bubbleMeta}>
                          <span style={s.bubbleTime}>{fmt(m.created_at)}</span>
                          {isMine && (m.read
                            ? <CheckCheck size={11} color="#60a5fa" />
                            : <Check size={11} color="#94a3b8" />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {threadMessages.length === 0 && <div style={s.empty}>No messages in this thread.</div>}
              </div>

              {/* Quick reply */}
              <div style={s.replyBar}>
                <input
                  style={s.replyInput}
                  placeholder="Type a reply…"
                  value={msgContent}
                  onChange={e => setMsgContent(e.target.value)}
                  onKeyDown={async e => {
                    if (e.key === 'Enter' && !e.shiftKey && msgContent.trim()) {
                      e.preventDefault()
                      if (!thread.partnerNum) return
                      setSending(true)
                      try {
                        const sent = await api.chat.send(thread.partnerNum, msgContent.trim())
                        setMessages(prev => [...prev, sent])
                        setMsgContent('')
                      } catch (err) {
                        setError(err.message)
                      } finally {
                        setSending(false)
                      }
                    }
                  }}
                />
                <button
                  style={{ ...s.sendBtn, opacity: (!msgContent.trim() || sending) ? 0.5 : 1 }}
                  disabled={!msgContent.trim() || sending || !thread.partnerNum}
                  onClick={async () => {
                    if (!thread.partnerNum || !msgContent.trim()) return
                    setSending(true)
                    try {
                      const newMsg = await api.chat.send(thread.partnerNum, msgContent.trim())
                      setMessages(prev => [...prev, newMsg])
                      setMsgContent('')
                    } catch (err) {
                      setError(err.message)
                    } finally {
                      setSending(false)
                    }
                  }}
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════ COMPOSE ═══════════════════ */}
          {tab === 'compose' && (
            <div style={s.compose}>
              <div style={s.composeLabel}>Find recipient by chat number or name</div>

              {/* Search box */}
              <div style={s.searchBox}>
                <Search size={14} color="#94a3b8" style={{ flexShrink: 0 }} />
                <input
                  style={s.searchInput}
                  placeholder="Enter 5-digit number or name…"
                  value={searchQ}
                  onChange={e => { handleSearchChange(e.target.value); setRecipient(null) }}
                  autoFocus
                />
                {searching && <RefreshCw size={12} color="#94a3b8" style={{ animation: 'spin 1s linear infinite' }} />}
              </div>

              {/* Search results */}
              {searchResults.length > 0 && !recipient && (
                <div style={s.resultList}>
                  {searchResults.map(u => (
                    <div key={u.id} style={s.resultRow} onClick={() => { setRecipient(u); setSearchQ(u.name) }}>
                      <div style={s.resultAvatar}>
                        {u.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={s.resultName}>{u.name}</div>
                        <div style={s.resultMeta}>{u.role}{u.company ? ` · ${u.company}` : ''}</div>
                      </div>
                      <div style={s.resultNum}>#{u.chat_number}</div>
                      <ChevronRight size={14} color="#94a3b8" />
                    </div>
                  ))}
                </div>
              )}
              {searchQ && !searching && searchResults.length === 0 && !recipient && (
                <div style={s.noResult}>No users found for "{searchQ}"</div>
              )}

              {/* Selected recipient chip */}
              {recipient && (
                <div style={s.recipientChip}>
                  <User size={12} color="#2563eb" />
                  <span style={s.chipName}>{recipient.name}</span>
                  <span style={s.chipNum}>#{recipient.chat_number}</span>
                  <button style={s.chipDel} onClick={() => { setRecipient(null); setSearchQ('') }}>
                    <X size={12} />
                  </button>
                </div>
              )}

              {/* Message textarea */}
              <textarea
                style={{ ...s.msgTextarea, opacity: recipient ? 1 : 0.5 }}
                placeholder={recipient ? `Write your message to ${recipient.name}…` : 'Select a recipient first'}
                value={msgContent}
                onChange={e => setMsgContent(e.target.value)}
                disabled={!recipient}
                rows={4}
              />

              {error && <ErrorBanner msg={error} />}
              {sent  && <div style={s.sentBanner}><Check size={13} color="#16a34a" /> Message sent!</div>}

              <button
                style={{ ...s.sendLargeBtn, opacity: (!recipient || !msgContent.trim() || sending) ? 0.6 : 1 }}
                disabled={!recipient || !msgContent.trim() || sending}
                onClick={handleSend}
              >
                <Send size={14} />
                {sending ? 'Sending…' : 'Send Message'}
              </button>
            </div>
          )}

        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}

function ErrorBanner({ msg }) {
  return (
    <div style={{ display:'flex',alignItems:'center',gap:6,padding:'8px 12px',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,fontSize:12,color:'#dc2626',margin:'8px 0' }}>
      {msg}
    </div>
  )
}

/* ── Styles ─────────────────────────────────────────────────── */
const s = {
  overlay:   { position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:16 },
  modal:     { background:'#fff',borderRadius:18,width:'100%',maxWidth:500,maxHeight:'88vh',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,0.22)',overflow:'hidden' },

  header:    { display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',background:'linear-gradient(135deg,#1e40af,#2563eb)',flexShrink:0 },
  headerLeft:{ display:'flex',alignItems:'center',gap:10 },
  headerIcon:{ width:34,height:34,borderRadius:10,background:'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center' },
  headerTitle:{ fontSize:14,fontWeight:800,color:'#fff' },
  headerSub: { display:'flex',alignItems:'center',gap:3,fontSize:10,color:'rgba(255,255,255,0.75)',marginTop:1 },
  closeBtn:  { background:'rgba(255,255,255,0.15)',border:'none',borderRadius:7,width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#fff' },

  tabs:      { display:'flex',background:'#f8fafc',borderBottom:'1px solid #e2e8f0',padding:'0 8px',flexShrink:0 },
  tab:       { display:'flex',alignItems:'center',gap:6,padding:'10px 14px',background:'none',border:'none',borderBottom:'2px solid transparent',fontSize:12,fontWeight:600,color:'#64748b',cursor:'pointer',transition:'all 0.15s',whiteSpace:'nowrap' },
  tabActive: { color:'#2563eb',borderBottomColor:'#2563eb' },
  badge:     { fontSize:10,fontWeight:800,padding:'1px 6px',borderRadius:20,background:'#dc2626',color:'#fff',marginLeft:2 },

  body:      { flex:1,overflowY:'auto',padding:14,display:'flex',flexDirection:'column',gap:10 },

  inboxToolbar:{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4 },
  inboxCount:  { fontSize:12,color:'#64748b',fontWeight:500 },
  refreshBtn:  { background:'none',border:'none',cursor:'pointer',color:'#94a3b8',padding:4,display:'flex',alignItems:'center',borderRadius:6 },

  empty:     { display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'32px 0',color:'#94a3b8',fontSize:13,textAlign:'center',gap:4 },

  threadList:{ display:'flex',flexDirection:'column',gap:2 },
  threadRow: { display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,cursor:'pointer',border:'1px solid #f1f5f9',transition:'background 0.1s' },
  threadAvatar:{ width:38,height:38,borderRadius:'50%',background:'#eff6ff',color:'#2563eb',fontSize:13,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 },
  threadName:{ fontSize:13,fontWeight:600,color:'#0f172a',display:'flex',alignItems:'center',gap:6 },
  threadNum: { fontSize:10,color:'#94a3b8',fontWeight:400 },
  threadPreview:{ fontSize:11,color:'#64748b',marginTop:2,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis',maxWidth:240 },
  threadMeta:{ display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4,flexShrink:0 },
  threadTime:{ fontSize:10,color:'#94a3b8' },
  unreadBadge:{ fontSize:10,fontWeight:800,padding:'1px 6px',borderRadius:20,background:'#2563eb',color:'#fff' },

  threadView:{ display:'flex',flexDirection:'column',height:'100%',gap:0 },
  threadHeader:{ display:'flex',alignItems:'center',gap:10,paddingBottom:10,borderBottom:'1px solid #f1f5f9',marginBottom:8,flexShrink:0 },
  backBtn:   { background:'#f1f5f9',border:'none',borderRadius:8,width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#475569',flexShrink:0 },

  messageList:{ flex:1,display:'flex',flexDirection:'column',gap:8,overflowY:'auto',paddingBottom:8,minHeight:120,maxHeight:300 },
  msgWrap:   { display:'flex',width:'100%' },
  bubble:    { maxWidth:'75%',padding:'8px 12px',borderRadius:12,display:'flex',flexDirection:'column',gap:4 },
  bubbleMine:{ background:'#2563eb',color:'#fff',borderBottomRightRadius:3 },
  bubbleTheirs:{ background:'#f1f5f9',color:'#0f172a',borderBottomLeftRadius:3 },
  bubbleText:{ fontSize:13,lineHeight:1.45,wordBreak:'break-word' },
  bubbleMeta:{ display:'flex',alignItems:'center',gap:4,justifyContent:'flex-end' },
  bubbleTime:{ fontSize:10,opacity:0.7 },

  replyBar:  { display:'flex',gap:8,paddingTop:8,borderTop:'1px solid #f1f5f9',flexShrink:0 },
  replyInput:{ flex:1,padding:'9px 12px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:13,color:'#0f172a',background:'#f8fafc',outline:'none' },
  sendBtn:   { width:36,height:36,borderRadius:10,background:'#2563eb',color:'#fff',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,alignSelf:'flex-end' },

  compose:   { display:'flex',flexDirection:'column',gap:12 },
  composeLabel:{ fontSize:12,fontWeight:600,color:'#475569' },
  searchBox: { display:'flex',alignItems:'center',gap:8,background:'#f8fafc',border:'1.5px solid #e2e8f0',borderRadius:10,padding:'9px 12px' },
  searchInput:{ flex:1,border:'none',background:'none',outline:'none',fontSize:13,color:'#0f172a' },

  resultList:{ border:'1px solid #e2e8f0',borderRadius:10,overflow:'hidden' },
  resultRow: { display:'flex',alignItems:'center',gap:10,padding:'10px 12px',cursor:'pointer',borderBottom:'1px solid #f1f5f9',background:'#fff',transition:'background 0.1s' },
  resultAvatar:{ width:34,height:34,borderRadius:'50%',background:'#eff6ff',color:'#2563eb',fontSize:12,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 },
  resultName:{ fontSize:13,fontWeight:600,color:'#0f172a' },
  resultMeta:{ fontSize:11,color:'#64748b',marginTop:1,textTransform:'capitalize' },
  resultNum: { fontSize:11,fontWeight:700,color:'#2563eb',background:'#eff6ff',padding:'2px 7px',borderRadius:20 },

  noResult:  { fontSize:12,color:'#94a3b8',padding:'8px 4px' },

  recipientChip:{ display:'flex',alignItems:'center',gap:6,padding:'6px 12px',background:'#eff6ff',border:'1.5px solid #bfdbfe',borderRadius:10 },
  chipName:  { fontSize:13,fontWeight:600,color:'#1d4ed8',flex:1 },
  chipNum:   { fontSize:11,color:'#3b82f6',fontWeight:700 },
  chipDel:   { background:'none',border:'none',cursor:'pointer',color:'#93c5fd',display:'flex',alignItems:'center',padding:2 },

  msgTextarea:{ width:'100%',padding:'10px 12px',border:'1.5px solid #e2e8f0',borderRadius:10,fontSize:13,color:'#0f172a',background:'#f8fafc',resize:'vertical',fontFamily:'inherit',outline:'none',boxSizing:'border-box',transition:'opacity 0.15s' },

  sentBanner:{ display:'flex',alignItems:'center',gap:6,padding:'8px 12px',background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:8,fontSize:12,color:'#16a34a',fontWeight:600 },

  sendLargeBtn:{ display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'11px',borderRadius:11,background:'linear-gradient(135deg,#2563eb,#1d4ed8)',color:'#fff',border:'none',fontSize:14,fontWeight:700,cursor:'pointer',transition:'opacity 0.15s',boxShadow:'0 4px 14px rgba(37,99,235,0.25)' },
}
