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
  return { id: Date.now(), title, messages: [] }
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
          <>
            <div style={{ background: '#7c3aed', color: '#fff', fontSize: '0.875rem', padding: '12px 18px', borderRadius: '18px 4px 18px 18px', lineHeight: 1.6, wordBreak: 'break-word' }}>
              {text}
            </div>
            {!loading && (
              <button onClick={() => setIsEditing(true)} style={{ background: 'none', border: 'none', color: '#7c3aed', fontSize: '0.8rem', cursor: 'pointer', marginTop: 6, padding: '4px 10px', fontWeight: 500, borderRadius: 6 }}>
                ✏️ Edit
              </button>
            )}
          </>
        )}
      </div>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 600, flexShrink: 0, marginTop: 2 }}>AB</div>
    </div>
  )
}

function AgentBubble({ text, steps, loading }) {
  const [copied, setCopied] = useState(false)
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
            {copied ? '✓ Copied' : '⎘ Copy'}
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
        <div style={{ textYign: 'center', padding: '40px 0', color: '#a3a3a3' }}>
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

function SettingsTab() {
  const [model, setModel] = useState('llama-3.3-70b-versatile')
  const [chunks, setChunks] = useState(500)
  const [overlap, setOverlap] = useState(50)
  const [saved, setSaved] = useState(false)
  function save() { setSaved(true); setTimeout(() => setSaved(false), 2000) }
  const card = { background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, padding: 16, marginBottom: 12 }
  const label = { fontSize: '0.75rem', color: '#525252', display: 'block', marginBottom: 4 }
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
      <p style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: 12 }}>Agent Settings</p>
      <div style={card}>
        <p style={{ fontSize: 11, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>LLM</p>
        <label style={label}>Model</label>
        <select value={model} onChange={e => setModel(e.target.value)} style={{ width: '100%', border: '1px solid #e5e5e5', borderRadius: 8, padding: '10px 12px', fontSize: '0.875rem', background: '#fff', outline: 'none' }}>
          <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile</option>
          <option value="llama3-70b-8192">llama3-70b-8192</option>
          <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (faster)</option>
        </select>
      </div>
      <div style={card}>
        <p style={{ fontSize: 11, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>RAG Pipeline</p>
        {[
          ['Chunk size', chunks, setChunks, 100, 1000, 50],
          ['Chunk overlap', overlap, setOverlap, 0, 200, 10]
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

// ── Quick Actions Configuration ────────────────────────────────
const quickActions = [
  { id: 'Research',  label: 'Research',  icon: '🔍', textToInsert: 'Research: ' },
  { id: 'Summarize', label: 'Summarize', icon: '📝', textToInsert: 'Summarize: ' },
  { id: 'Explain',   label: 'Explain',   icon: '💡', textToInsert: 'Explain: ' },
  { id: 'Compare',   label: 'Compare',   icon: '⚖️',  textToInsert: 'Compare: ' },
  { id: 'Analyze',   label: 'Analyze',   icon: '📊', textToInsert: 'Analyze: ' },
]

// ── Main App ───────────────────────────────────────────────────
export default function App() {
  const [sessions, setSessions] = useState(() => {
    try { const s = localStorage.getItem('aria_sessions'); return s ? JSON.parse(s) : [createSession('Welcome')] }
    catch { return [createSession('Welcome')] }
  })
  const [activeId, setActiveId] = useState(() => {
    try { return Number(localStorage.getItem('aria_active_id')) || sessions[0]?.id }
    catch { return sessions[0]?.id }
  })
  const [activeTab, setActiveTab]   = useState('chat')
  const [attachments, setAttachments] = useState([])
  const [loading, setLoading]       = useState(false)
  const [stats, setStats]           = useState({ searches: 0, chunks_stored: 0, reports: 0, tokens_used: '0.0k' })
  const [notification, setNotification] = useState('')
  const [chatInputText, setChatInputText] = useState('')
  
  const activeControllerRef = useRef(null)
  const bottomRef    = useRef()
  const fileInputRef = useRef()
  
  const activeSession = sessions.find(s => s.id === activeId) || sessions[0]
  const isHome = !activeSession || activeSession.messages.length === 0

  useEffect(() => { 
    if (sessions.length > 0) {
      localStorage.setItem('aria_sessions', JSON.stringify(sessions)) 
    }
  }, [sessions])

  useEffect(() => { 
    localStorage.setItem('aria_active_id', activeId) 
  }, [activeId])

  useEffect(() => { 
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) 
  }, [activeSession?.messages, loading])
  
  useEffect(() => {
    let m = true
    const fetch_ = async () => { try { const r = await fetch(`${API}/api/stats`); if(r.ok && m) setStats(await r.json()) } catch(_) {} }
    fetch_(); const t = setInterval(fetch_, 5000); return () => { m = false; clearInterval(t) }
  }, [])

  function notify(msg) { setNotification(msg); setTimeout(() => setNotification(''), 3000) }
  
  function newChat() {
    const s = createSession('New chat')
    setSessions(p => [s, ...p])
    setActiveId(s.id)
    setActiveTab('chat')
    setAttachments([])
    setChatInputText('')
  }

  function handleFileAttach(e) { setAttachments(p => [...p, ...Array.from(e.target.files)]); e.target.value = '' }
  function removeAttach(i) { setAttachments(p => p.filter((_, idx) => idx !== i)) }

  function handleStopGeneration() {
    if (activeControllerRef.current) {
      activeControllerRef.current.abort()
      activeControllerRef.current = null
    }
  }

  function handleQuickActionClick(text) {
    setChatInputText(text)
  }

  // ── Core Inline Rewrite Execution Handler ───────────────────────
  async function executeInlineRewrite(targetMsgIndex, newText) {
    if (loading) return
    const cid = activeId
    const controller = new AbortController()
    activeControllerRef.current = controller

    setSessions(prevSessions => prevSessions.map(s => {
      if (s.id !== cid) return s
      
      const adjustedMessages = s.messages.slice(0, targetMsgIndex + 1)
      adjustedMessages[targetMsgIndex] = { ...adjustedMessages[targetMsgIndex], text: newText }
      
      return {
        ...s,
        title: targetMsgIndex === 0 ? (newText.slice(0, 30) || s.title) : s.title,
        messages: [
          ...adjustedMessages,
          { role: 'agent', loading: true }
        ]
      }
    }))

    setLoading(true)

    try {
      let report = '', steps = []
      
      const r = await fetch(`${API}/api/research`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ topic: newText }),
        signal: controller.signal 
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const d = await r.json(); report = d.report || ''; steps = [...steps, ...(d.steps || [])]

      setSessions(prevSessions => prevSessions.map(s => {
        if (s.id !== cid) return s
        const updatedMessages = s.messages.map((msg, idx) => {
          if (idx === s.messages.length - 1 && msg.loading) {
            return { role: 'agent', text: report, steps: steps }
          }
          return msg
        })
        return { ...s, messages: updatedMessages }
      }))

    } catch(err) {
      const isChatAborted = err.name === 'AbortError'
      const fallbackErrorMsg = `Error: ${err.message}\n\nStart backend:\nuvicorn main:app --reload --port 8000`
      
      setSessions(prevSessions => prevSessions.map(s => {
        if (s.id !== cid) return s
        const updatedMessages = s.messages.map((msg, idx) => {
          if (idx === s.messages.length - 1 && msg.loading) {
            return { 
              role: 'agent', 
              text: isChatAborted ? '*Generation stopped by user.*' : fallbackErrorMsg, 
              steps: [] 
            }
          }
          return msg
        })
        return { ...s, messages: updatedMessages }
      }))
    } finally { 
      setLoading(false) 
      activeControllerRef.current = null
    }
  }

  // ── Core Async Send Message Logic ────────────────────────────
  async function sendMessage(text) {
    if ((!text && attachments.length === 0) || loading) return
    const cid   = activeId
    const ctext = text
    const cfiles = [...attachments]
    
    const controller = new AbortController()
    activeControllerRef.current = controller

    setSessions(prevSessions => prevSessions.map(s => {
      if (s.id !== cid) return s
      const isInitialChat = s.title === 'New chat' || s.title === 'Welcome'
      return {
        ...s,
        title: isInitialChat ? (text.slice(0, 30) || s.title) : s.title,
        messages: [
          ...s.messages,
          { role: 'user', text: text || '(file attached)', files: cfiles.map(f => ({ name: f.name, type: f.type })) },
          { role: 'agent', loading: true }
        ]
      }
    }))
    
    setAttachments([]); setLoading(true)
    
    try {
      let report = '', steps = []
      const pdfs   = cfiles.filter(f => f.type === 'application/pdf' || f.name?.endsWith('.txt'))
      const images = cfiles.filter(f => f.type?.startsWith('image/'))
      
      for (const f of pdfs) {
        const fd = new FormData(); fd.append('file', f)
        try { 
          const r = await fetch(`${API}/api/upload`, { method: 'POST', body: fd, signal: controller.signal })
          const d = await r.json()
          steps.push(`✓ ${f.name} — ${d.chunks_stored || 0} chunks stored`) 
        } catch (fErr) { 
          if (fErr.name === 'AbortError') throw fErr
          steps.push(`✗ Failed to store ${f.name}`) 
        }
      }

      if (ctext) {
        const r = await fetch(`${API}/api/research`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ topic: ctext }),
          signal: controller.signal 
        })
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const d = await r.json(); report = d.report || ''; steps = [...steps, ...(d.steps || [])]
      } else if (pdfs.length) {
        report = `Stored in ChromaDB:\n${pdfs.map(f => `• ${f.name}`).join('\n')}\n\nAsk me anything about these documents!`
      } else if (images.length) {
        report = `I see ${images.length} image(s) attached. Type your question about them!`
      }
      
      setSessions(prevSessions => prevSessions.map(s => {
        if (s.id !== cid) return s
        const updatedMessages = s.messages.map((msg, idx) => {
          if (idx === s.messages.length - 1 && msg.loading) {
            return { role: 'agent', text: report, steps: steps }
          }
          return msg
        })
        return { ...s, messages: updatedMessages }
      }))

    } catch(err) {
      const isChatAborted = err.name === 'AbortError'
      const fallbackErrorMsg = `Error: ${err.message}\n\nStart backend:\nuvicorn main:app --reload --port 8000`
      
      setSessions(prevSessions => prevSessions.map(s => {
        if (s.id !== cid) return s
        const updatedMessages = s.messages.map((msg, idx) => {
          if (idx === s.messages.length - 1 && msg.loading) {
            return { 
              role: 'agent', 
              text: isChatAborted ? '*Generation stopped by user.*' : fallbackErrorMsg, 
              steps: [] 
            }
          }
          return msg
        })
        return { ...s, messages: updatedMessages }
      }))
    } finally { 
      setLoading(false) 
      activeControllerRef.current = null
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
        
        <nav style={{ padding: '6px 0' }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', background: activeTab === item.id ? '#fff' : 'transparent', color: activeTab === item.id ? '#7c3aed' : '#525252', fontSize: '0.9rem', fontWeight: activeTab === item.id ? 600 : 400, border: 'none', borderRight: activeTab === item.id ? '3px solid #7c3aed' : '3px solid transparent', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ fontSize: '1.05rem' }}>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        
        <div style={{ padding: '12px 20px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: 10, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Recent Tabs</p>
          <button onClick={() => { const s = createSession('Welcome'); setSessions([s]); setActiveId(s.id); localStorage.clear(); setChatInputText('') }}
            style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, padding: '2px 6px' }}>Clear</button>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {sessions.map(s => (
            <button key={s.id} onClick={() => { setActiveId(s.id); setActiveTab('chat') }}
              style={{ width: '100%', textAlign: 'left', padding: '10px 20px', fontSize: '0.8rem', color: s.id === activeId && activeTab === 'chat' ? '#7c3aed' : '#6b7280', background: s.id === activeId && activeTab === 'chat' ? '#f3f0ff' : 'transparent', fontWeight: s.id === activeId && activeTab === 'chat' ? 600 : 400, border: 'none', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              📁 {s.title}
            </button>
          ))}
        </div>
        
        <div style={{ borderTop: '1px solid #e5e5e5', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>AB</div>
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 500, color: '#111', margin: 0 }}>Anurag</p>
            <p style={{ fontSize: 10, color: '#a3a3a3', margin: 0 }}>Intern · Free</p>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ─────────────────────────────────── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#fafafa' }}>
        <div style={{ padding: '12px 24px', borderBottom: '1px solid #e5e5e5', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.875rem', fontWeight: 500, color: '#111' }}>
            <StatusDot active={!loading} />
            {loading ? 'Aria is thinking...' : 'Aria ready'}
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
                  <InputBox onSend={sendMessage} onStop={handleStopGeneration} loading={loading} autoFocus
                    fileInputRef={fileInputRef} attachments={attachments}
                    onFileAttach={handleFileAttach} onRemoveAttach={removeAttach}
                    inputValue={chatInputText} setInputValue={setChatInputText} />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', maxWidth: 680 }}>
                  {quickActions.map(a => (
                    <button key={a.id} onClick={() => handleQuickActionClick(a.textToInsert)}
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
                      ? <UserBubble key={i} text={msg.text} files={msg.files} messageIndex={i} onRewrite={executeInlineRewrite} loading={loading} />
                      : <AgentBubble key={i} text={msg.text} steps={msg.steps} loading={msg.loading} />
                  ))}
                  <div ref={bottomRef} />
                </div>
                <div style={{ flexShrink: 0 }}>
                  <InputBox onSend={sendMessage} onStop={handleStopGeneration} loading={loading} autoFocus={false}
                    fileInputRef={fileInputRef} attachments={attachments}
                    onFileAttach={handleFileAttach} onRemoveAttach={removeAttach}
                    inputValue={chatInputText} setInputValue={setChatInputText} />
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'knowledge' && <KnowledgeBaseTab onNotify={notify} />}
        {activeTab === 'reports' && <ReportsTab sessions={sessions} />}
        {activeTab === 'settings' && <SettingsTab />}
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