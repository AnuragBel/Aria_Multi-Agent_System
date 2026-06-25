import React, { useState, useEffect, useRef } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const API = 'http://localhost:8000'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Good night'
}

// ── Error Boundary ─────────────────────────────────────────────
class MarkdownErrorBoundary extends React.Component {
  constructor(props) { 
    super(props)
    this.state = { hasError: false } 
  }
  static getDerivedStateFromError() { 
    return { hasError: true } 
  }
  render() {
    if (this.state.hasError) {
      return <p style={{ fontSize: '0.875rem', color: '#262626', whiteSpace: 'pre-wrap' }}>{this.props.fallbackText}</p>
    }
    return this.props.children
  }
}

// ── Markdown components (v9 compatible) ────────────────────────
const MD = {
  h1: ({ children }) => <h1 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#111', margin: '4px 0 8px' }}>{children}</h1>,
  h2: ({ children }) => <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#111', margin: '12px 0 6px' }}>{children}</h2>,
  h3: ({ children }) => <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#111', margin: '8px 0 4px' }}>{children}</h3>,
  p:  ({ children }) => <p  style={{ fontSize: '0.875rem', color: '#262626', lineHeight: 1.7, margin: '0 0 8px' }}>{children}</p>,
  ul: ({ children }) => <ul style={{ fontSize: '0.875rem', color: '#262626', paddingLeft: '18px', margin: '0 0 8px', listStyleType: 'disc' }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ fontSize: '0.875rem', color: '#262626', paddingLeft: '18px', margin: '0 0 8px', listStyleType: 'decimal' }}>{children}</ol>,
  li: ({ children }) => <li style={{ fontSize: '0.875rem', color: '#404040', marginBottom: '3px', lineHeight: 1.6 }}>{children}</li>,
  strong: ({ children }) => <strong style={{ fontWeight: 600, color: '#111' }}>{children}</strong>,
  em: ({ children }) => <em style={{ fontStyle: 'italic' }}>{children}</em>,
  hr: () => <hr style={{ border: 'none', borderTop: '1px solid #e5e5e5', margin: '12px 0' }} />,
  a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#7c3aed', textDecoration: 'underline' }}>{children}</a>,
  blockquote: ({ children }) => <blockquote style={{ borderLeft: '3px solid #c4b5fd', paddingLeft: '12px', color: '#737373', fontStyle: 'italic', margin: '8px 0' }}>{children}</blockquote>,
  code: ({ inline, className, children }) => {
    const lang = /language-(\w+)/.exec(className || '')?.[1]
    if (!inline && lang) return (
      <div style={{ margin: '8px 0', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e5e5' }}>
        <div style={{ background: '#f5f5f5', padding: '4px 12px', fontSize: '11px', color: '#888', fontFamily: 'monospace', borderBottom: '1px solid #e5e5e5' }}>{lang}</div>
        <pre style={{ background: '#1a1a2e', color: '#e2e8f0', padding: '12px', margin: 0, overflowX: 'auto', fontSize: '0.8rem', fontFamily: 'monospace', lineHeight: 1.6 }}><code>{String(children).replace(/\n$/, '')}</code></pre>
      </div>
    )
    return <code style={{ background: '#f3f0ff', color: '#6d28d9', padding: '1px 5px', borderRadius: '4px', fontSize: '0.8rem', fontFamily: 'monospace' }}>{children}</code>
  },
  table: ({ children }) => <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', margin: '8px 0' }}>{children}</table>,
  th: ({ children }) => <th style={{ background: '#f5f5f5', border: '1px solid #e5e5e5', padding: '6px 10px', textAlign: 'left', fontWeight: 600 }}>{children}</th>,
  td: ({ children }) => <td style={{ border: '1px solid #e5e5e5', padding: '6px 10px' }}>{children}</td>,
}

function SafeMarkdown({ text }) {
  return (
    <MarkdownErrorBoundary fallbackText={text}>
      <Markdown remarkPlugins={[remarkGfm]} components={MD}>{text || ''}</Markdown>
    </MarkdownErrorBoundary>
  )
}

// ── Utility ────────────────────────────────────────────────────
function StatusDot({ active }) {
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: active ? '#22c55e' : '#d4d4d4', marginRight: 6, flexShrink: 0 }} />
}

// ── Quick Actions Configuration ────────────────────────────────
const quickActions = [
  { id: 'DeepResearch', label: 'Deep Research', icon: '🔬', textToInsert: 'Deep Research: ' },
  { id: 'Summarize',    label: 'Summarize',     icon: '📝', textToInsert: 'Summarize: ' },
  { id: 'Explain',      label: 'Explain',       icon: '💡', textToInsert: 'Explain: ' },
  { id: 'Compare',      label: 'Compare',       icon: '⚖️',  textToInsert: 'Compare: ' },
  { id: 'Analyze',      label: 'Analyze',       icon: '📊', textToInsert: 'Analyze: ' },
]

function StepList({ steps }) {
  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f5f5f5' }}>
      {steps.map((step, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 4 }}>
          <span style={{ color: '#22c55e', fontSize: 11, marginTop: 1, flexShrink: 0 }}>✓</span>
          <span style={{ fontSize: 11, color: '#737373', lineHeight: 1.5 }}>{step}</span>
        </div>
      ))}
    </div>
  )
}

function createSession(title = 'New chat') {
  return { id: Date.now(), title, messages: [], isPinned: false, projectName: null, projectDescription: null }
}

// ── Message Bubbles ────────────────────────────────────────────
function UserBubble({ text, files, messageIndex, onRewrite, loading }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(text)

  function handleSave() {
    if (!editValue.trim() || loading) return
    onRewrite(messageIndex, editValue.trim())
    setIsEditing(false)
  }

  function handleRefresh() {
    if (loading) return
    onRewrite(messageIndex, text)
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'flex-start' }}>
      <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', width: isEditing ? '100%' : 'auto' }}>
        {files?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end', marginBottom: 4 }}>
            {files.map((f, i) => (
              <span key={i} style={{ fontSize: 11, background: '#ede9fe', color: '#6d28d9', padding: '2px 8px', borderRadius: 20, border: '1px solid #c4b5fd' }}>
                📎 {f.name}
              </span>
            ))}
          </div>
        )}

        {isEditing ? (
          <div style={{ width: '100%', background: '#fff', border: '1.5px solid #7c3aed', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <textarea 
              value={editValue} 
              onChange={e => setEditValue(e.target.value)}
              rows={2}
              style={{ width: '100%', border: 'none', outline: 'none', resize: 'none', fontSize: '0.875rem', fontFamily: 'inherit', color: '#262626', lineHeight: 1.5 }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => { setIsEditing(false); setEditValue(text) }} style={{ background: '#f5f5f5', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: '0.8rem', cursor: 'pointer', color: '#737373', fontWeight: 500 }}>
                Cancel
              </button>
              <button onClick={handleSave} style={{ background: '#7c3aed', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: '0.8rem', cursor: 'pointer', color: '#fff', fontWeight: 600 }}>
                Save & Resend
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
            <div style={{ background: '#7c3aed', color: '#fff', fontSize: '0.875rem', padding: '12px 18px', borderRadius: '18px 4px 18px 18px', lineHeight: 1.6, wordBreak: 'break-word' }}>
              {text}
            </div>
            
            <div style={{ display: 'flex', gap: 12, marginTop: 2, paddingRight: 4 }}>
              <button 
                onClick={() => setIsEditing(true)} 
                style={{ background: 'none', border: 'none', color: '#7c3aed', fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>
                ✏️ 
              </button>

              <button 
                onClick={handleRefresh}
                disabled={loading}
                style={{ background: 'none', border: 'none', color: '#7c3aed', fontSize: 11, cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 500, opacity: loading ? 0.5 : 1 }}>
                🔄 
              </button>

              <button 
                onClick={() => navigator.clipboard.writeText(text)} 
                style={{ background: 'none', border: 'none', color: '#7c3aed', fontSize: 11, cursor: 'pointer', fontWeight: 500 }}
                title="Copy text">
                ⎘ 
              </button>
            </div>
          </div>
        )}
      </div>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 600, flexShrink: 0, marginTop: 2 }}>AB</div>
    </div>
  )
}

function AgentBubble({ text, steps, loading, followupQuestions }) {
  const [copied, setCopied] = useState(false)
  const [pendingFollowup, setPendingFollowup] = useState(null)
  function copy() {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #e5e5e5', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, marginTop: 2 }}>🤖</div>
      <div style={{ maxWidth: '80%', background: '#fff', border: '1px solid #e5e5e5', borderRadius: '4px 18px 18px 18px', padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', position: 'relative' }}>
        
        {!loading && text && (
          <button onClick={copy} style={{ position: 'absolute', top: 12, right: 14, fontSize: '0.8rem', color: copied ? '#16a34a' : '#525252', background: '#fff', border: '1px solid #d4d4d4', borderRadius: 8, cursor: 'pointer', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', zIndex: 10, fontWeight: 500 }}>
            {copied ? '✓ Copied' : '⎘'}
          </button>
        )}

        {loading ? (
          <div style={{ display: 'flex', gap: 4, padding: '6px 0' }}>
            {[0, 150, 300].map(d => (
              <span key={d} style={{ width: 8, height: 8, borderRadius: '50%', background: '#d4d4d4', display: 'inline-block', animation: `bounce 1.2s ${d}ms infinite` }} />
            ))}
          </div>
        ) : (
          <>
            <div style={{ wordBreak: 'break-word', paddingRight: 60 }}><SafeMarkdown text={text} /></div>
            {steps?.length > 0 && <StepList steps={steps} />}
            {followupQuestions?.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {followupQuestions.map((q, i) => (
                  <button key={i} 
                    onClick={() => { setPendingFollowup(q); window.dispatchEvent(new CustomEvent('aria-followup', { detail: q })); }}
                    disabled={pendingFollowup === q}
                    style={{ padding: '6px 12px', background: pendingFollowup === q ? '#ddd6fe' : '#f3f0ff', border: pendingFollowup === q ? '1px solid #a78bfa' : '1px solid #c4b5fd', borderRadius: 20, fontSize: '0.75rem', color: pendingFollowup === q ? '#5b21b6' : '#6d28d9', cursor: pendingFollowup === q ? 'wait' : 'pointer', fontWeight: 500, transition: 'all 0.15s', opacity: pendingFollowup === q ? 0.7 : 1 }}>
                    {pendingFollowup === q ? '⏳ Sending...' : q}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Input Box ──────────────────────────────────────────────────
function InputBox({ onSend, onStop, loading, autoFocus, fileInputRef, attachments, onFileAttach, onRemoveAttach, inputValue, setInputValue }) {
  const [listening, setListening] = useState(false)
  const taRef = useRef()

  useEffect(() => {
    const ta = taRef.current
    if (ta && inputValue) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 160) + 'px' }
  }, [inputValue])

  function handleInput(e) {
    setInputValue(e.target.value)
    const ta = taRef.current
    if (ta) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 160) + 'px' }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { 
      e.preventDefault()
      if (!loading) send() 
    }
  }

  function send() {
    if ((!inputValue.trim() && attachments.length === 0) || loading) return
    onSend(inputValue.trim())
    setInputValue('')
    if (taRef.current) taRef.current.style.height = 'auto'
  }

  function startVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Voice not supported. Use Chrome.'); return }
    const r = new SR(); r.lang = 'en-US'; r.interimResults = false
    setListening(true); r.start()
    r.onresult = e => { setInputValue(p => p + (p ? ' ' : '') + e.results[0][0].transcript) }
    r.onerror = () => setListening(false)
    r.onend   = () => setListening(false)
  }

  return (
    <div>
      {attachments.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {attachments.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#ede9fe', border: '1px solid #c4b5fd', color: '#6d28d9', fontSize: 11, padding: '4px 10px', borderRadius: 8 }}>
              <span>{f.type?.startsWith('image/') ? '🖼️' : '📄'}</span>
              <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
              <button onClick={() => onRemoveAttach(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a78bfa', marginLeft: 2, padding: 2, fontSize: 12 }}>✕</button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', background: '#fff', border: '1.5px solid #e5e5e5', borderRadius: 24, padding: '10px 16px', transition: 'border-color 0.15s' }}
        onFocus={e => e.currentTarget.style.borderColor = '#7c3aed'}
        onBlur={e => e.currentTarget.style.borderColor = '#e5e5e5'}>
        <button onClick={() => fileInputRef.current.click()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed', fontSize: 22, padding: '0 6px', alignSelf: 'flex-end', marginBottom: 3, fontWeight: 'bold' }} title="Attach file">+</button>
        <input ref={fileInputRef} type="file" accept="image/*,.pdf,.txt" multiple style={{ display: 'none' }} onChange={onFileAttach} />
        <textarea ref={taRef} value={inputValue} onChange={handleInput} onKeyDown={handleKey}
          placeholder="Ask anything or enter a research topic..."
          rows={1} autoFocus={autoFocus}
          style={{ flex: 1, resize: 'none', border: 'none', outline: 'none', fontSize: '0.875rem', lineHeight: 1.6, background: 'transparent', color: '#262626', fontFamily: 'inherit', padding: '6px 0', maxHeight: 160, overflow: 'auto' }} />
        
        <button onClick={startVoice} disabled={loading} style={{ width: 38, height: 38, borderRadius: 12, border: '1px solid #e5e5e5', background: listening ? '#ef4444' : '#fff', color: listening ? '#fff' : '#a3a3a3', cursor: 'pointer', flexShrink: 0, alignSelf: 'flex-end', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Voice">🎙️</button>
        
        {loading ? (
          <button onClick={onStop}
            style={{ width: 38, height: 38, borderRadius: 12, background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', flexShrink: 0, alignSelf: 'flex-end', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Stop generation">⏹</button>
        ) : (
          <button onClick={send} disabled={!inputValue.trim() && attachments.length === 0}
            style={{ width: 38, height: 38, borderRadius: 12, background: '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer', flexShrink: 0, alignSelf: 'flex-end', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (!inputValue.trim() && attachments.length === 0) ? 0.3 : 1 }}
            aria-label="Send">↑</button>
        )}
      </div>
      <p style={{ fontSize: 10, color: '#a3a3a3', textAlign: 'center', marginTop: 6 }}>Enter to send · Shift+Enter for new line · + to attach</p>
    </div>
  )
}

// ── Tab Views ──────────────────────────────────────────────────
function KnowledgeBaseTab({ onNotify }) {
  const [uploading, setUploading] = useState(false)
  const [files, setFiles] = useState([])
  const ref = useRef()

  async function handleUpload(e) {
    const file = e.target.files[0]; if (!file) return
    setUploading(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch(`${API}/api/upload`, { method: 'POST', body: fd })
      const data = await res.json()
      setFiles(p => [...p, { name: file.name, chunks: data.chunks_stored || 0, date: new Date().toLocaleDateString() }])
      onNotify(`✓ ${file.name} — ${data.chunks_stored || 0} chunks stored`)
    } catch (err) { onNotify(`✗ Upload failed: ${err.message}`) }
    finally { setUploading(false); e.target.value = '' }
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
      <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111', marginBottom: 4 }}>Upload to Memory</p>
      <p style={{ fontSize: '0.75rem', color: '#737373', marginBottom: 12 }}>PDF or .txt files get chunked and stored in ChromaDB.</p>
      <button onClick={() => ref.current.click()} disabled={uploading}
        style={{ width: '100%', padding: '16px', border: '2px dashed #7c3aed', borderRadius: 12, background: '#fbfbfe', color: '#7c3aed', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {uploading ? '⏳ Uploading...' : '📎 Click to upload PDF or .txt'}
      </button>
      <input ref={ref} type="file" accept=".pdf,.txt" style={{ display: 'none' }} onChange={handleUpload} />
      {files.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#a3a3a3' }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>🗄️</p>
          <p style={{ fontSize: '0.875rem' }}>No documents uploaded yet</p>
        </div>
      ) : files.map((f, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, padding: '12px 16px', marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span>📄</span>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 500, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</p>
              <p style={{ fontSize: 11, color: '#a3a3a3' }}>{f.date}</p>
            </div>
          </div>
          <span style={{ fontSize: 11, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '4px 10px', borderRadius: 20, flexShrink: 0, marginLeft: 8 }}>{f.chunks} chunks</span>
        </div>
      ))}
    </div>
  )
}

function ReportsTab({ sessions }) {
  const reports = sessions.flatMap(s => s.messages.filter(m => m.role === 'agent' && m.text && !m.loading)).reverse()
  function download(text, i) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([`Report #${i+1}\n${'='.repeat(50)}\n\n${text}`], { type: 'text/plain' }))
    a.download = `report_${i+1}.txt`; a.click()
  }
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
      <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111', marginBottom: 12 }}>Generated Reports ({reports.length})</p>
      {reports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#a3a3a3' }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>📄</p>
          <p style={{ fontSize: '0.875rem' }}>No reports yet. Research a topic first.</p>
        </div>
      ) : reports.map((msg, i) => (
        <div key={i} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, padding: 16, marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 8 }}>
            <p style={{ fontSize: '0.75rem', color: '#525252', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', margin: 0 }}>{msg.text?.slice(0, 100)}...</p>
            <button onClick={() => download(msg.text, i)} style={{ fontSize: '0.8rem', color: '#7c3aed', border: '1px solid #c4b5fd', background: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', flexShrink: 0, fontWeight: 500 }}>↓ Save</button>
          </div>
          <p style={{ fontSize: 11, color: '#a3a3a3', margin: 0 }}>Report #{reports.length - i}</p>
        </div>
      ))}
    </div>
  )
}

function SettingsTab({ model, onModelChange, chunks, onChunksChange, overlap, onOverlapChange }) {
  const [saved, setSaved] = useState(false)
  const savedTimer = useRef(null)
  function save() {
    setSaved(true)
    if (savedTimer.current) clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => { setSaved(false); savedTimer.current = null }, 2000)
  }
  useEffect(() => () => { if (savedTimer.current) clearTimeout(savedTimer.current) }, [])
  const card = { background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, padding: 16, marginBottom: 12 }
  const label = { fontSize: '0.75rem', color: '#525252', display: 'block', marginBottom: 4 }
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
      <p style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: 12 }}>Agent Settings</p>
      <div style={card}>
        <p style={{ fontSize: 11, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>LLM</p>
        <label style={label}>Model</label>
        <select value={model} onChange={e => onModelChange(e.target.value)} style={{ width: '100%', border: '1px solid #e5e5e5', borderRadius: 8, padding: '10px 12px', fontSize: '0.875rem', background: '#fff', outline: 'none' }}>
          <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile</option>
          <option value="llama3-70b-8192">llama3-70b-8192</option>
          <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (faster)</option>
        </select>
      </div>
      <div style={card}>
        <p style={{ fontSize: 11, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>RAG Pipeline</p>
        {[
          ['Chunk size', chunks, onChunksChange, 100, 1000, 50],
          ['Chunk overlap', overlap, onOverlapChange, 0, 200, 10]
        ].map(([lbl, val, set, min, max, step]) => (
          <div key={lbl} style={{ marginBottom: 12 }}>
            <label style={label}>{lbl}: <strong>{val}</strong></label>
            <input type="range" min={min} max={max} step={step} value={val} onChange={e => set(Number(e.target.value))} style={{ width: '100%', accentColor: '#7c3aed' }} />
          </div>
        ))}
      </div>
      <button onClick={save} style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: saved ? '#22c55e' : '#7c3aed', color: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
        {saved ? '✓ Saved!' : 'Save Settings'}
      </button>
      <div style={{ ...card, marginTop: 12 }}>
        <p style={{ fontSize: 11, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Stack Info</p>
        {[
          ['Frontend', 'React + Vite + Tailwind v4'],
          ['Backend', 'FastAPI + Python 3.12'],
          ['LLM', 'Groq ' + model],
          ['Memory', 'ChromaDB (local)'],
          ['Agents', 'CrewAI 3-agent']
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>
            <span style={{ fontSize: '0.75rem', color: '#737373' }}>{k}</span>
            <span style={{ fontSize: '0.75rem', color: '#262626', fontWeight: 500 }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Project Modal ───────────────────────────────────────────────
function ProjectModal({ session, onSave, onClose }) {
  const [name, setName] = useState(session?.projectName || '')
  const [description, setDescription] = useState(session?.projectDescription || '')

  function handleSave() {
    onSave({ projectName: name.trim() || null, projectDescription: description.trim() || null })
    onClose()
  }

  function handleClear() {
    onSave({ projectName: null, projectDescription: null })
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#111', margin: 0 }}>📁 Project Context</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#a3a3a3', padding: 4 }}>✕</button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#737373', marginBottom: 6, fontWeight: 500 }}>Project Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g., Made In India: A Titan Story"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#737373', marginBottom: 6, fontWeight: 500 }}>Description (optional)</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Brief description of the project..."
            rows={3}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          {session?.projectName && (
            <button onClick={handleClear} style={{ padding: '10px 16px', border: '1px solid #fecaca', background: '#fff', color: '#dc2626', borderRadius: 8, fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>
              Clear Project
            </button>
          )}
          <button onClick={handleSave} style={{ padding: '10px 20px', border: 'none', background: '#7c3aed', color: '#fff', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main App Component ─────────────────────────────────────────
export default function App() {
  const [sessions, setSessions] = useState(() => {
    const saved = localStorage.getItem('aria_sessions')
    return saved ? JSON.parse(saved) : [createSession('Welcome')]
  })
  const [activeId, setActiveId] = useState(() => sessions[0]?.id || Date.now())
  const [activeTab, setActiveTab] = useState('chat')
  const [chatInputText, setChatInputText] = useState('')
  const [attachments, setAttachments] = useState([])
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState('')
  const [searchQuery, setSearchQuery] = useState('') // New Search State For Chat Filtering
  const [projectModalOpen, setProjectModalOpen] = useState(false)
   
  // High level active menu tracking state to prevent invalid nested hooks
  const [activeMenuId, setActiveMenuId] = useState(null)

  const [settingsModel, setSettingsModel] = useState(() => localStorage.getItem('aria_model') || 'llama-3.3-70b-versatile')
  const [chunkSize, setChunkSize] = useState(() => Number(localStorage.getItem('aria_chunk_size')) || 500)
  const [chunkOverlap, setChunkOverlap] = useState(() => Number(localStorage.getItem('aria_chunk_overlap')) || 50)

  const [stats, setStats] = useState({
    searches: 0,
    chunks_stored: 0,
    reports: 0,
    tokens_used: 0,
    token_status: 'normal'
  })

  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)
  const activeControllerRef = useRef(null)
  const sendMessageRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('aria_sessions', JSON.stringify(sessions))
  }, [sessions])

  useEffect(() => {
    localStorage.setItem('aria_model', settingsModel)
  }, [settingsModel])

  useEffect(() => {
    localStorage.setItem('aria_chunk_size', String(chunkSize))
  }, [chunkSize])

  useEffect(() => {
    localStorage.setItem('aria_chunk_overlap', String(chunkOverlap))
  }, [chunkOverlap])

  useEffect(() => {
    if (activeTab === 'chat') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [sessions, activeTab])

  useEffect(() => {
    let mounted = true
    async function pollStats() {
      try {
        const res = await fetch(`${API}/api/stats`)
        if (!res.ok) return
        const data = await res.json()
        if (!mounted) return
        const tokens = parseFloat(data.tokens_used) || 0
        setStats({
          searches: data.searches ?? 0,
          chunks_stored: data.chunks_stored ?? 0,
          reports: data.reports ?? 0,
          tokens_used: tokens,
          token_status: tokens > 90 ? 'critical' : tokens > 70 ? 'warning' : 'normal'
        })
      } catch { /* server not available */ }
    }
    pollStats()
    const interval = setInterval(pollStats, 10000)
    return () => { mounted = false; clearInterval(interval) }
  }, [])

  useEffect(() => {
    function handleFollowup(e) {
      sendMessageRef.current?.(e.detail)
    }
    window.addEventListener('aria-followup', handleFollowup)
    return () => window.removeEventListener('aria-followup', handleFollowup)
  }, [])

  const activeSession = sessions.find(s => s.id === activeId) || sessions[0] || createSession()
  const isHome = activeSession.messages.length === 0

  // Filtered sessions computation based on search input
  const filteredSessions = sessions.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  function notify(msg) {
    setNotification(msg)
    setTimeout(() => setNotification(''), 4000)
  }

  function newChat() {
    const s = createSession()
    setSessions(prev => [s, ...prev])
    setActiveId(s.id)
    setActiveTab('chat')
    setSearchQuery('') // Clear search when a new chat opens
  }

  function handleStopGeneration() {
    if (activeControllerRef.current) {
      activeControllerRef.current.abort()
    }
  }

  function handleFileAttach(e) {
    const files = Array.from(e.target.files)
    setAttachments(prev => [...prev, ...files])
    e.target.value = ''
  }

  function removeAttach(idx) {
    setAttachments(prev => prev.filter((_, i) => i !== idx))
  }

  function handleQuickActionClick(action) {
    setChatInputText(action.textToInsert)
  }

  function handlePinSession(id) {
    setSessions(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, isPinned: !s.isPinned } : s)
      return [...updated].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
    })
  }

  function handleRenameSession(id) {
    const target = sessions.find(s => s.id === id)
    const newTitle = prompt('Rename Chat Session:', target?.title || '')
    if (newTitle && newTitle.trim()) {
      setSessions(prev => prev.map(s => s.id === id ? { ...s, title: newTitle.trim() } : s))
    }
  }

  function handleDeleteSession(id) {
    if (sessions.length <= 1) {
      alert('Cannot delete the last remaining chat session.')
      return
    }
    if (confirm('Are you sure you want to delete this chat?')) {
      setSessions(prev => prev.filter(s => s.id !== id))
      if (activeId === id) {
        const remaining = sessions.filter(s => s.id !== id)
        setActiveId(remaining[0].id)
      }
    }
  }

  function openProjectModal() {
    setProjectModalOpen(true)
  }

  function closeProjectModal() {
    setProjectModalOpen(false)
  }

  function handleProjectSave(name, description) {
    setSessions(prev => prev.map(s => 
      s.id === activeId ? { ...s, projectName: name.trim() || null, projectDescription: description.trim() || null } : s
    ))
    closeProjectModal()
    notify(`✓ Project context set: ${name.trim() || '(cleared)'}`)
  }

  function handleProjectClear() {
    setSessions(prev => prev.map(s => 
      s.id === activeId ? { ...s, projectName: null, projectDescription: null } : s
    ))
    closeProjectModal()
    notify('✓ Project context cleared')
  }

  function executeInlineRewrite(messageIndex, newText) {
    if (loading) return
    const truncatedMessages = activeSession.messages.slice(0, messageIndex)
    setSessions(prev => prev.map(s => s.id === activeId ? { ...s, messages: truncatedMessages } : s))
    sendMessage(newText)
  }

  async function sendMessage(overrideText) {
  sendMessageRef.current = sendMessage
  const textToSend = overrideText || chatInputText;
  if (!textToSend.trim() && attachments.length === 0) return;

  const currentAttachments = [...attachments];
  setAttachments([]);
  setLoading(true);

  const userMsg = { 
    role: 'user', 
    text: textToSend, 
    files: currentAttachments.map(f => ({ name: f.name })) 
  };
  const placeholderAgentMsg = { role: 'agent', text: '', steps: [], loading: true };

  let cid = activeId;
  setSessions(prevSessions => prevSessions.map(s => {
    if (s.id !== cid) return s;
    const isFirstMsg = s.messages.length === 0;
    return {
      ...s,
      title: isFirstMsg ? (textToSend.slice(0, 24) || 'File Upload Chat') : s.title,
      messages: [...s.messages, userMsg, placeholderAgentMsg]
    };
  }));

  const controller = new AbortController();
  activeControllerRef.current = controller;

  let report = '';
  let steps = [];
  let followupQuestions = [];
  let ctext = textToSend;
  let finalDeepOption = false;

  if (ctext.toLowerCase().startsWith('deep research:')) {
    finalDeepOption = true;
    ctext = ctext.slice(14).trim();
  }

  try {
    // ── CORRECTED ASYNC LOOP FOR UPLOADS ───────────────────────
    for (const fileObj of currentAttachments) {
      steps.push(`Uploading ${fileObj.name} to ingestion pipeline...`);
      
      const fd = new FormData();
      fd.append('file', fileObj);

      const fRes = await fetch(`${API}/api/upload`, { 
        method: 'POST', 
        body: fd, 
        signal: controller.signal 
      });
      
      if (!fRes.ok) {
        throw new Error(`Upload failed with status ${fRes.status}`);
      }
      
      const d = await fRes.json();
      steps.push(`✓ ${fileObj.name} — ${d.chunks_stored || 0} chunks stored`); 
    }

    // ── RESEARCH EXECUTION ─────────────────────────────────────
    if (ctext) {
      const r = await fetch(`${API}/api/research`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({
        topic: ctext,
        deep_research: finalDeepOption,
        is_followup: activeSession.messages.length > 2,
        history: activeSession.messages.slice(-6).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text
  })),
        project_context: activeSession.projectName ? {
          name: activeSession.projectName,
          description: activeSession.projectDescription
        } : null
}),
        signal: controller.signal 
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      report = d.report || '';
      steps = [...steps, ...(d.steps || [])];
      followupQuestions = d.followup_questions || [];
    } else if (currentAttachments.length > 0) {
      report = `I've processed your files successfully and saved them to my RAG memory layer! \n\n${currentAttachments.map(f => `• **${f.name}**`).join('\n')}\n\nWhat would you like me to analyze or look up from these documents, bro? 📊`;
    }
    
    // ── UPDATE MESSAGE STATE ───────────────────────────────────
    setSessions(prevSessions => prevSessions.map(s => {
      if (s.id !== cid) return s;
      return {
        ...s,
        messages: s.messages.map((msg, idx) => {
          if (idx === s.messages.length - 1 && msg.loading) {
            return { role: 'agent', text: report, steps: steps, loading: false, followupQuestions };
          }
          return msg;
        })
      };
    }));

  } catch(err) {
    if (err.name === 'AbortError') {
      report = '*Generation stopped by user.*';
    } else {
      report = `✗ Request failed: ${err.message}\n\nMake sure your FastAPI server is active on port 8000.`;
    }
    
    setSessions(prevSessions => prevSessions.map(s => {
      if (s.id !== cid) return s;
      return {
        ...s,
        messages: s.messages.map((msg, idx) => {
          if (idx === s.messages.length - 1 && msg.loading) {
            return { role: 'agent', text: report, steps: [], loading: false };
          }
          return msg;
        })
      };
    }));
  } finally { 
    setLoading(false); 
    activeControllerRef.current = null;
  }
}

  const navItems = [
    { id: 'chat',      label: 'Chat',           icon: '💬' },
    { id: 'knowledge', label: 'Knowledge Base',  icon: '🗄️' },
    { id: 'reports',   label: 'Reports',         icon: '📄' },
    { id: 'settings',  label: 'Settings',        icon: '⚙️' },
  ]

  const sidebar = { width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid #e5e5e5', background: '#fafafa', height: '100vh', overflow: 'hidden' }
  const rightSidebar = { width: 176, flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: '1px solid #e5e5e5', background: '#fafafa' }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f5f5f5', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', color: '#111', overflow: 'hidden' }}>
      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:#e5e5e5;border-radius:4px}
        button:hover{opacity:0.85; transform: translateY(-0.5px);} * {box-sizing:border-box}
      `}</style>
      
      {/* ── LEFT SIDEBAR ──────────────────────────────────── */}
      <aside style={sidebar}>
        <div style={{ padding: '16px', borderBottom: '1px solid #e5e5e5', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>A</div>
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111', margin: 0 }}>Aria</p>
            <p style={{ fontSize: 10, color: '#a3a3a3', margin: 0 }}>Groq · CrewAI · RAG</p>
          </div>
        </div>
        
        <div style={{ padding: '12px 14px 6px' }}>
          <button onClick={newChat} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', borderRadius: 12, border: '1px solid #c4b5fd', background: '#fff', color: '#7c3aed', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 3px rgba(124,58,237,0.05)' }}>
            ✏️ New chat
          </button>
        </div>
        
        <div style={{ padding: '0 14px 6px' }}>
          <button onClick={openProjectModal} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', borderRadius: 10, border: '1px solid #e5e5e5', background: '#fff', color: '#525252', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' }}>
            📁 Project
            {activeSession.projectName && <span style={{ background: '#7c3aed', color: '#fff', fontSize: '0.65rem', padding: '2px 6px', borderRadius: 10, fontWeight: 600, marginLeft: 4 }}>{activeSession.projectName.slice(0, 12)}</span>}
          </button>
        </div>
        
        <nav style={{ padding: '6px 0' }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', background: activeTab === item.id ? '#fff' : 'transparent', color: activeTab === item.id ? '#7c3aed' : '#525252', fontSize: '0.9rem', fontWeight: activeTab === item.id ? 600 : 400, border: 'none', borderRight: activeTab === item.id ? '3px solid #7c3aed' : '3px solid transparent', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ fontSize: '1.05rem' }}>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>

        {/* 🔍 ADDED: CHAT SEARCH BAR CONTAINER */}
        <div style={{ padding: '4px 14px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #e5e5e5', borderRadius: '8px', padding: '4px 10px', width: '100%' }}>
            <span style={{ fontSize: '0.85rem', color: '#a3a3a3', marginRight: '6px', userSelect: 'none' }}>🔍</span>
            <input 
              type="text"
              placeholder="Search history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: '0.8rem', background: 'transparent', color: '#262626', width: '100%' }}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: '#a3a3a3', cursor: 'pointer', fontSize: '0.75rem', padding: '2px 4px', fontWeight: 'bold' }}>
                ✕
              </button>
            )}
          </div>
        </div>
        
        <div style={{ padding: '6px 20px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: 10, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Recent Chats</p>
          <button onClick={() => { const s = createSession('Welcome'); setSessions([s]); setActiveId(s.id); localStorage.clear(); setChatInputText(''); setSearchQuery('') }}
            style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, padding: '2px 6px' }}>Clear</button>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredSessions.length === 0 ? (
            <p style={{ fontSize: '0.75rem', color: '#a3a3a3', padding: '12px 20px', margin: 0, fontStyle: 'italic' }}>No chats found</p>
          ) : (
            filteredSessions.map(s => {
              const isMenuOpen = activeMenuId === s.id

              return (
                <div 
                  key={s.id} 
                  onMouseLeave={() => setActiveMenuId(null)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '2px 8px 2px 20px', 
                    background: s.id === activeId && activeTab === 'chat' ? '#f3f0ff' : 'transparent',
                    position: 'relative',
                    borderRadius: '8px',
                    margin: '2px 8px'
                  }}
                >
                  {/* Session Navigation Title */}
                  <button 
                    onClick={() => { setActiveId(s.id); setActiveTab('chat') }}
                    style={{ flex: 1, textAlign: 'left', fontSize: '0.8rem', color: s.id === activeId && activeTab === 'chat' ? '#7c3aed' : '#6b7280', border: 'none', fontWeight: s.id === activeId && activeTab === 'chat' ? 600 : 400, background: 'transparent', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '6px 0' }}>
                    {s.isPinned ? '📌 ' : '📁 '} {s.title}
                  </button>

                  {/* 3-Dots Menu Button */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); setActiveMenuId(isMenuOpen ? null : s.id) }}
                    style={{ background: 'none', border: 'none', color: '#a3a3a3', cursor: 'pointer', fontSize: '1rem', padding: '4px 8px', fontWeight: 'bold' }}
                  >
                    ⋮
                  </button>

                  {/* Action Dropdown Menu */}
                  {isMenuOpen && (
                    <div style={{ position: 'absolute', top: '28px', right: '10px', background: '#fff', border: '1px solid #e5e5e5', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 100, display: 'flex', flexDirection: 'column', padding: '4px', minWidth: '110px' }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); handlePinSession(s.id); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', fontSize: '0.75rem', color: '#404040', background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', borderRadius: '4px' }}
                      >
                        📌 {s.isPinned ? 'Unpin' : 'Pin'}
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); handleRenameSession(s.id); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', fontSize: '0.75rem', color: '#404040', background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', borderRadius: '4px' }}
                      >
                        ✏️ Rename
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); handleDeleteSession(s.id); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', fontSize: '0.75rem', color: '#ef4444', background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', borderRadius: '4px' }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
        
        <div style={{ borderTop: '1px solid #e5e5e5', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>AB</div>
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 500, color: '#111', margin: 0 }}>Anurag</p>
            <p style={{ fontSize: 10, color: '#a3a3a3', margin: 0 }}>Intern · Free</p>
          </div>
        </div>
      </aside>

      {projectModalOpen && (
        <ProjectModal 
          session={activeSession} 
          onSave={handleProjectSave} 
          onClose={closeProjectModal} 
        />
      )}

      {/* ── MAIN CONTENT ─────────────────────────────────── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#fafafa' }}>
        <div style={{ padding: '12px 24px', borderBottom: '1px solid #e5e5e5', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.875rem', fontWeight: 500, color: '#111' }}>
            <StatusDot active={!loading} />
            {loading ? 'Aria is thinking...' : 'Aria ready'}
            {activeSession.projectName && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: '#f3f0ff', border: '1px solid #c4b5fd', borderRadius: 20, fontSize: '0.7rem', color: '#6d28d9', fontWeight: 500 }}>
                📁 {activeSession.projectName}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['Web', 'RAG', 'CrewAI'].map(t => (
              <span key={t} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, border: '1px solid #e5e5e5', color: '#737373', background: '#fafafa' }}>{t}</span>
            ))}
          </div>
        </div>

        {stats.token_status === 'warning' && (
          <div style={{ margin: '8px 20px 0', padding: '6px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, fontSize: 11, color: '#92400e' }}>⚠️ 70k+ tokens used today</div>
        )}
        {stats.token_status === 'critical' && (
          <div style={{ margin: '8px 20px 0', padding: '6px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, fontSize: 11, color: '#991b1b' }}>🔴 Near daily token limit</div>
        )}
        {notification && (
          <div style={{ margin: '8px 20px 0', padding: '8px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, fontSize: '0.75rem', color: '#166534', flexShrink: 0 }}>{notification}</div>
        )}

        {activeTab === 'chat' && (
          <>
            {isHome ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px 48px' }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                  <h1 style={{ fontSize: '2.5rem', fontWeight: 500, color: '#111', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
                    {getGreeting()}, Bro 👋
                  </h1>
                  <p style={{ fontSize: '1rem', color: '#737373', margin: 0 }}>I'm Aria, your AI research buddy 🤖</p>
                </div>
                
                <div style={{ width: '100%', maxWidth: 680, marginBottom: 24 }}>
                  <InputBox 
                    onSend={sendMessage} 
                    onStop={handleStopGeneration} 
                    loading={loading} 
                    autoFocus
                    fileInputRef={fileInputRef} 
                    attachments={attachments}
                    onFileAttach={handleFileAttach} 
                    onRemoveAttach={removeAttach}
                    inputValue={chatInputText} 
                    setInputValue={setChatInputText} 
                  />
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', maxWidth: 680 }}>
                  {quickActions.map(a => (
                    <button key={a.id} onClick={() => handleQuickActionClick(a)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 24, border: '1px solid #d4d4d4', background: '#fff', color: '#404040', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                      <span>{a.icon}</span>{a.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: 20 }}>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>
                  {activeSession.messages.map((msg, i) => (
                    msg.role === 'user'          
                      ? <UserBubble 
                          key={i} 
                          text={msg.text} 
                          files={msg.files} 
                          messageIndex={i} 
                          onRewrite={executeInlineRewrite} 
                          loading={loading} 
                        />
                      : <AgentBubble 
                          key={i} 
                          text={msg.text} 
                          steps={msg.steps} 
                          loading={msg.loading} 
                          followupQuestions={msg.followupQuestions} 
                        />
                  ))}
                  <div ref={bottomRef} />
                </div>
                
                <div style={{ flexShrink: 0 }}>
                  <InputBox 
                    onSend={sendMessage} 
                    onStop={handleStopGeneration} 
                    loading={loading} 
                    autoFocus={false}
                    fileInputRef={fileInputRef} 
                    attachments={attachments}
                    onFileAttach={handleFileAttach} 
                    onRemoveAttach={removeAttach}
                    inputValue={chatInputText} 
                    setInputValue={setChatInputText} 
                  />
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'knowledge' && <KnowledgeBaseTab onNotify={notify} />}
        {activeTab === 'reports' && <ReportsTab sessions={sessions} />}
        {activeTab === 'settings' && (
          <SettingsTab
            model={settingsModel}
            onModelChange={setSettingsModel}
            chunks={chunkSize}
            onChunksChange={setChunkSize}
            overlap={chunkOverlap}
            onOverlapChange={setChunkOverlap}
          />
        )}
      </main>

      {/* ── RIGHT SIDEBAR ────────────────────────────────── */}
      <aside style={rightSidebar}>
        <div style={{ padding: '12px', borderBottom: '1px solid #e5e5e5' }}>
          <p style={{ fontSize: 10, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>Session Stats</p>
          {[
            { label: 'Searches', value: stats.searches },
            { label: 'Chunks stored', value: stats.chunks_stored },
            { label: 'Reports', value: stats.reports },
            { label: 'Tokens used', value: stats.tokens_used },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: '0.75rem', color: '#737373' }}>{s.label}</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#262626' }}>{s.value}</span>
            </div>
          ))}
        </div>

        <div style={{ padding: '12px', borderBottom: '1px solid #e5e5e5' }}>
          <p style={{ fontSize: 10, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>Active Tools</p>
          {[
            { name: 'Tavily search', active: true },
            { name: 'ChromaDB', active: true },
            { name: 'Groq LLaMA', active: true },
            { name: 'PDF reader', active: false },
          ].map(t => (
            <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <StatusDot active={t.active} />
              <span style={{ fontSize: '0.75rem', color: '#737373', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
            </div>
          ))}
        </div>

        <div style={{ padding: '12px' }}>
          <p style={{ fontSize: 10, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>System Agents</p>
          {[
            { name: 'Researcher', icon: '🔍' },
            { name: 'Writer', icon: '✍️' },
          ].map(a => (
            <div key={a.name} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <StatusDot active={true} />
              <span style={{ fontSize: '0.75rem', color: '#737373' }}>{a.icon} {a.name}</span>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid #e5e5e5', padding: '12px', marginTop: 'auto' }}>
          <p style={{ fontSize: 10, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Local Storage</p>
          <p style={{ fontSize: '0.75rem', fontWeight: 500, color: '#525252', margin: 0 }}>{sessions.length} Chats Tracked</p>
        </div>
      </aside>
    </div>
  )
}