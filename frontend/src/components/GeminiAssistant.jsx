import { useState, useEffect, useRef } from 'react'
import { api } from '../utils/api'
import { X, Send, Sparkles, Bot, User, Loader, AlertCircle, ChevronDown } from 'lucide-react'

const SUGGESTED = [
  'Which shipments are at highest risk right now?',
  'Explain the current disruption in simple terms',
  'What route alternatives are recommended?',
  'How does the risk score work?',
  'What are the cost impacts of active disruptions?',
  'Which shipments need immediate attention?',
]

export default function GeminiAssistant({ onClose }) {
  const [messages,   setMessages]   = useState([{
    role: 'assistant',
    content: "👋 Hi! I'm **ChainShield AI**, powered by Google Gemini.\n\nI have live access to your shipment data, risk scores, and active disruptions. Ask me anything about your supply chain!",
    ts: Date.now(),
  }])
  const [input,      setInput]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [configured, setConfigured] = useState(null)  // null = unknown
  const [error,      setError]      = useState(null)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  // Check if Gemini API is configured
  useEffect(() => {
    api.gemini.status()
      .then(r => setConfigured(r.configured))
      .catch(() => setConfigured(false))
  }, [])

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text) => {
    const userMsg = text || input.trim()
    if (!userMsg || loading) return
    setInput('')
    setError(null)

    const newMessages = [...messages, { role: 'user', content: userMsg, ts: Date.now() }]
    setMessages(newMessages)
    setLoading(true)

    // Build history (skip the first assistant greeting for context efficiency)
    const history = newMessages
      .slice(1)
      .map(m => ({ role: m.role, content: m.content }))
      .slice(0, -1)  // exclude the message we're about to send

    try {
      const res = await api.gemini.chat(userMsg, history)
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply, ts: Date.now(), model: res.model }])
    } catch (err) {
      setError(err.message)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Sorry, I encountered an error. Please try again.',
        ts: Date.now(),
        isError: true,
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.panel} onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div style={s.header}>
          <div style={s.headerLeft}>
            <div style={s.geminiIcon}>
              <Sparkles size={16} color="#fff" />
            </div>
            <div>
              <div style={s.headerTitle}>ChainShield AI</div>
              <div style={s.headerSub}>
                {configured === true  && <span style={s.liveChip}>● Gemini 1.5 Flash</span>}
                {configured === false && <span style={s.fallbackChip}>● Smart Fallback</span>}
                {configured === null  && <span style={s.fallbackChip}>● Connecting…</span>}
              </div>
            </div>
          </div>
          <button style={s.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        {/* ── API key notice ── */}
        {configured === false && (
          <div style={s.apiNotice}>
            <AlertCircle size={13} color="#d97706" style={{ flexShrink: 0 }} />
            <span>
              Add <code style={s.code}>GEMINI_API_KEY</code> to <code style={s.code}>backend/.env</code> for full AI responses.
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={s.link}> Get key →</a>
            </span>
          </div>
        )}

        {/* ── Messages ── */}
        <div style={s.messages}>
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}
          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* ── Suggestions (only before first user message) ── */}
        {messages.length === 1 && !loading && (
          <div style={s.suggestions}>
            <div style={s.suggestLabel}>Try asking:</div>
            <div style={s.suggestGrid}>
              {SUGGESTED.slice(0, 4).map(q => (
                <button key={q} style={s.suggestBtn} onClick={() => sendMessage(q)}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Input ── */}
        <div style={s.inputRow}>
          <textarea
            ref={inputRef}
            style={s.input}
            placeholder="Ask about shipments, disruptions, risk scores…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
            disabled={loading}
          />
          <button
            style={{ ...s.sendBtn, opacity: (!input.trim() || loading) ? 0.45 : 1 }}
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
          >
            {loading ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
          </button>
        </div>

        <div style={s.footer}>Powered by Google Gemini · Live shipment context</div>
      </div>
    </div>
  )
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  // Parse markdown-ish bold (**text**)
  const renderContent = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((p, i) =>
      p.startsWith('**') && p.endsWith('**')
        ? <strong key={i}>{p.slice(2, -2)}</strong>
        : p
    )
  }

  return (
    <div style={{ ...s.msgRow, flexDirection: isUser ? 'row-reverse' : 'row' }}>
      <div style={{ ...s.avatar, background: isUser ? '#2563eb' : 'linear-gradient(135deg,#7c3aed,#2563eb)' }}>
        {isUser ? <User size={13} color="#fff" /> : <Sparkles size={13} color="#fff" />}
      </div>
      <div style={{
        ...s.bubble,
        background:   isUser ? 'linear-gradient(135deg,#2563eb,#1d4ed8)' : '#f8fafc',
        color:        isUser ? '#fff' : '#1e293b',
        borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
        border:       isUser ? 'none' : '1px solid #e2e8f0',
        marginLeft:   isUser ? 'auto' : 0,
        maxWidth:     '82%',
      }}>
        <div style={s.bubbleText}>
          {msg.content.split('\n').map((line, i) => (
            <span key={i}>{renderContent(line)}{i < msg.content.split('\n').length - 1 && <br />}</span>
          ))}
        </div>
        <div style={{ ...s.bubbleTime, color: isUser ? 'rgba(255,255,255,0.6)' : '#94a3b8' }}>
          {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {msg.model && msg.model !== 'fallback' && msg.model !== 'error' && ` · ${msg.model}`}
        </div>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div style={{ ...s.msgRow, flexDirection: 'row' }}>
      <div style={{ ...s.avatar, background: 'linear-gradient(135deg,#7c3aed,#2563eb)' }}>
        <Sparkles size={13} color="#fff" />
      </div>
      <div style={{ ...s.bubble, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px 16px 16px 16px' }}>
        <div style={s.typingDots}>
          <span style={{ ...s.dot, animationDelay: '0ms' }} />
          <span style={{ ...s.dot, animationDelay: '160ms' }} />
          <span style={{ ...s.dot, animationDelay: '320ms' }} />
        </div>
      </div>
    </div>
  )
}

const s = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
    padding: '0 24px 24px 0', zIndex: 1100,
    backdropFilter: 'blur(2px)',
  },
  panel: {
    width: 420, maxWidth: '95vw', height: '78vh', maxHeight: 680,
    background: '#fff', borderRadius: 20,
    boxShadow: '0 32px 64px rgba(0,0,0,0.22)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    animation: 'slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 16px',
    background: 'linear-gradient(135deg,#1e3a8a,#4c1d95)',
    flexShrink: 0,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  geminiIcon: {
    width: 36, height: 36, borderRadius: 10,
    background: 'rgba(255,255,255,0.2)',
    border: '1.5px solid rgba(255,255,255,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  headerTitle: { fontSize: 15, fontWeight: 800, color: '#fff' },
  headerSub:   { fontSize: 11, marginTop: 2 },
  liveChip:    { color: '#86efac', fontWeight: 600 },
  fallbackChip:{ color: 'rgba(255,255,255,0.65)', fontWeight: 600 },
  closeBtn: {
    background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8,
    padding: 6, cursor: 'pointer', color: '#fff',
    display: 'flex', alignItems: 'center',
  },
  apiNotice: {
    display: 'flex', alignItems: 'flex-start', gap: 7,
    padding: '8px 14px', background: '#fffbeb',
    borderBottom: '1px solid #fde68a',
    fontSize: 11, color: '#92400e', lineHeight: 1.5, flexShrink: 0,
  },
  code: { fontFamily: 'monospace', background: '#fde68a', padding: '1px 4px', borderRadius: 3 },
  link: { color: '#d97706', fontWeight: 700 },
  messages: {
    flex: 1, overflowY: 'auto', padding: '14px 14px 8px',
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  msgRow:   { display: 'flex', alignItems: 'flex-end', gap: 8 },
  avatar:   {
    width: 28, height: 28, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  bubble:       { padding: '10px 13px', maxWidth: '82%' },
  bubbleText:   { fontSize: 13, lineHeight: 1.55 },
  bubbleTime:   { fontSize: 10, marginTop: 5, textAlign: 'right' },
  suggestions: {
    padding: '0 14px 10px', flexShrink: 0,
  },
  suggestLabel: { fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 },
  suggestGrid:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 },
  suggestBtn:   {
    padding: '7px 9px', background: '#f8fafc', border: '1px solid #e2e8f0',
    borderRadius: 9, fontSize: 11, color: '#475569', cursor: 'pointer',
    textAlign: 'left', lineHeight: 1.4, transition: 'background 0.15s',
  },
  inputRow: {
    display: 'flex', alignItems: 'flex-end', gap: 8,
    padding: '10px 12px', borderTop: '1px solid #f1f5f9', flexShrink: 0,
  },
  input: {
    flex: 1, padding: '9px 12px', borderRadius: 12,
    border: '1.5px solid #e2e8f0', fontSize: 13, color: '#0f172a',
    resize: 'none', fontFamily: 'inherit', outline: 'none',
    lineHeight: 1.4, maxHeight: 100,
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
    background: 'linear-gradient(135deg,#2563eb,#7c3aed)',
    border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'opacity 0.15s',
  },
  footer: {
    textAlign: 'center', fontSize: 10, color: '#cbd5e1',
    padding: '4px 0 8px', flexShrink: 0,
  },
  typingDots: { display: 'flex', gap: 4, padding: '4px 2px' },
  dot: {
    width: 7, height: 7, borderRadius: '50%', background: '#94a3b8',
    animation: 'bounce 1s infinite',
  },
}
