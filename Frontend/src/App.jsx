import React, { useState, useEffect, useRef } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { API } from './constants.js'
import {
  Bot,
  Pin,
  Folder as FolderIcon,
  Download,
  X,
  Image as ImageIcon,
  MoreHorizontal,
  Edit,
  Trash2,
  AlertTriangle,
  AlertCircle,
  FileText,
  MessageSquare as MsgSquare,
  Search as SearchIcon,
  Mic,
  Send,
  ChevronDown,
  ChevronUp,
  Plus,
  StopCircle,
  Loader2,
  Paperclip,
  RotateCcw,
  Copy,
  Check,
  Settings as SettingsIcon,
  Sparkles,
  Eye,
  EyeOff
} from 'lucide-react'

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
  p: ({ children }) => <p  style={{ fontSize: '0.875rem', color: '#262626', lineHeight: 1.7, margin: '0 0 8px' }}>{children}</p>,
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
  { id: 'DeepResearch', label: 'Deep Research', icon: <SearchIcon size={14} strokeWidth={2} />, textToInsert: 'Deep Research: ' },
  { id: 'Summarize', label: 'Summarize', icon: <FileText size={14} strokeWidth={2} />, textToInsert: 'Summarize: ' },
  { id: 'Explain', label: 'Explain', icon: <MsgSquare size={14} strokeWidth={2} />, textToInsert: 'Explain: ' },
  { id: 'Compare', label: 'Compare', icon: <Copy size={14} strokeWidth={2} />, textToInsert: 'Compare: ' },
  { id: 'Analyze', label: 'Analyze', icon: <RotateCcw size={14} strokeWidth={2} />, textToInsert: 'Analyze: ' },
]

function StepList({ steps }) {
  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f5f5f5' }}>
      {steps.map((step, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 4 }}>
          <span style={{ color: '#22c55e', fontSize: 11, marginTop: 1, flexShrink: 0 }}><Check size={10} strokeWidth={2} /></span>
          <span style={{ fontSize: 11, color: '#737373', lineHeight: 1.6 }}>{step}</span>
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
                <Paperclip size={11} strokeWidth={2} /> {f.name}
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
                <Edit size={12} strokeWidth={2} />
              </button>

              <button 
                onClick={handleRefresh}
                disabled={loading}
                style={{ background: 'none', border: 'none', color: '#7c3aed', fontSize: 11, cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 500, opacity: loading ? 0.5 : 1 }}>
                <RotateCcw size={12} strokeWidth={2} />
              </button>

              <button 
                onClick={() => navigator.clipboard.writeText(text)} 
                style={{ background: 'none', border: 'none', color: '#7c3aed', fontSize: 11, cursor: 'pointer', fontWeight: 500 }}
                title="Copy text">
                <Copy size={12} strokeWidth={2} />
              </button>
            </div>
          </div>
        )}
      </div>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 600, flexShrink: 0, marginTop: 2 }}>AB</div>
    </div>
  )
}

function formatFollowupForUser(text) {
  if (!text) return ''
  let t = text.trim().replace(/^[\d+.)\-*•]\s*/, '')

  const m1 = t.match(/^(?:do you want to see|want to see)\s+(how to\s+.*)/i)
  if (m1) return `Yes, show me ${m1[1].replace(/[\s?]+$/, '')}`

  const m2 = t.match(/^(?:do you want to see|want to see)\s+(.*)/i)
  if (m2) return `Yes, I want to see ${m2[1].replace(/[\s?]+$/, '')}`

  const m3 = t.match(/^(?:do you want me to|would you like me to)\s+(.*)/i)
  if (m3) return `Yes, please ${m3[1].replace(/[\s?]+$/, '')}`

  const m4 = t.match(/^(?:do you want to|would you like to|want to)\s+(.*)/i)
  if (m4) return `Yes, I want to ${m4[1].replace(/[\s?]+$/, '')}`

  const m5 = t.match(/^(?:should I|can I)\s+(.*)/i)
  if (m5) return `Yes, please ${m5[1].replace(/[\s?]+$/, '')}`

  const m6 = t.match(/^(?:shall we|let's)\s+(.*)/i)
  if (m6) return `Let's ${m6[1].replace(/[\s?]+$/, '')}`

  const m7 = t.match(/^(?:are you interested in)\s+(.*)/i)
  if (m7) return `Tell me more about ${m7[1].replace(/[\s?]+$/, '')}`

  return t
}

function AgentBubble({ text, steps, loading, followupQuestions }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #e5e5e5', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, marginTop: 2 }}>
        <Bot size={14} strokeWidth={2} />
      </div>
      <div style={{ maxWidth: '80%', background: '#fff', border: '1px solid #e5e5e5', borderRadius: '4px 18px 18px 18px', padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', position: 'relative' }}>
        
        {!loading && text && (
          <button onClick={copy} style={{ position: 'absolute', top: 12, right: 14, fontSize: '0.8rem', color: copied ? '#16a34a' : '#525252', background: '#fff', border: '1px solid #d4d4d4', borderRadius: 8, cursor: 'pointer', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', zIndex: 10, fontWeight: 500 }}>
            {copied ? <Check size={14} strokeWidth={2} /> : <Copy size={14} strokeWidth={2} />}
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
            {followupQuestions && followupQuestions.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #f5f5f5' }}>
                <p style={{ fontSize: 10, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 6px' }}>Suggested Follow-ups</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {followupQuestions.map((rawQ, idx) => {
                    const prompt = formatFollowupForUser(rawQ)
                    return (
                      <button
                        key={idx}
                        onClick={() => window.dispatchEvent(new CustomEvent('aria-followup', { detail: prompt }))}
                        style={{
                          background: '#f5f3ff',
                          border: '1px solid #ddd6fe',
                          color: '#6d28d9',
                          borderRadius: 16,
                          padding: '4px 12px',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontWeight: 500,
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#ede9fe'; e.currentTarget.style.borderColor = '#c4b5fd' }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#f5f3ff'; e.currentTarget.style.borderColor = '#ddd6fe' }}
                      >
                        ✨ {prompt}
                      </button>
                    )
                  })}
                </div>
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
              <span>{f.type?.startsWith('image/') ? <ImageIcon size={11} strokeWidth={2} /> : <FileText size={11} strokeWidth={2} />}</span>
              <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
              <button onClick={() => onRemoveAttach(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a78bfa', marginLeft: 2, padding: 2, fontSize: 12 }}><X size={12} strokeWidth={2} /></button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', background: '#fff', border: '1.5px solid #e5e5e5', borderRadius: 24, padding: '10px 16px', transition: 'border-color 0.15s' }}
        onFocus={e => e.currentTarget.style.borderColor = '#7c3aed'}
        onBlur={e => e.currentTarget.style.borderColor = '#e5e5e5'}>
        <button onClick={() => fileInputRef.current.click()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed', fontSize: 22, padding: '0 6px', alignSelf: 'flex-end', marginBottom: 3, fontWeight: 'bold' }} title="Attach file"><Plus size={20} strokeWidth={2} /></button>
        <input ref={fileInputRef} type="file" accept="image/*,.pdf,.txt" multiple style={{ display: 'none' }} onChange={onFileAttach} />
        <textarea ref={taRef} value={inputValue} onChange={handleInput} onKeyDown={handleKey}
          placeholder="Ask anything or enter a research topic..."
          rows={1} autoFocus={autoFocus}
          style={{ flex: 1, resize: 'none', border: 'none', outline: 'none', fontSize: '0.875rem', lineHeight: 1.6, background: 'transparent', color: '#262626', fontFamily: 'inherit', padding: '6px 0', maxHeight: 160, overflow: 'auto' }} />
        
        <button onClick={startVoice} disabled={loading} style={{ width: 38, height: 38, borderRadius: 12, border: '1px solid #e5e5e5', background: listening ? '#ef4444' : '#fff', color: listening ? '#fff' : '#a3a3a3', cursor: 'pointer', flexShrink: 0, alignSelf: 'flex-end', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Voice"><Mic size={16} strokeWidth={2} /></button>
        
        {loading ? (
          <button onClick={onStop}
            style={{ width: 38, height: 38, borderRadius: 12, background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', flexShrink: 0, alignSelf: 'flex-end', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Stop generation"><StopCircle size={14} strokeWidth={2} /></button>
        ) : (
          <button onClick={send} disabled={!inputValue.trim() && attachments.length === 0}
            style={{ width: 38, height: 38, borderRadius: 12, background: '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer', flexShrink: 0, alignSelf: 'flex-end', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (!inputValue.trim() && attachments.length === 0) ? 0.3 : 1 }}
            aria-label="Send"><Send size={14} strokeWidth={2} /></button>
        )}
      </div>
      <p style={{ fontSize: 10, color: '#a3a3a3', textAlign: 'center', marginTop: 6 }}>Enter to send · Shift+Enter for new line · + to attach</p>
    </div>
  )
}

// ── Tab Views ──────────────────────────────────────────────────
function KnowledgeBaseTab({ onNotify, chunkSize, chunkOverlap }) {
  const [uploading, setUploading] = useState(false)
  const [files, setFiles] = useState(() => {
    try {
      const saved = localStorage.getItem('aria_uploaded_files')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [totalChunks, setTotalChunks] = useState(0)
  const [queryInput, setQueryInput] = useState('')
  const [queryLoading, setQueryLoading] = useState(false)
  const [queryResult, setQueryResult] = useState(null)
  const [querySources, setQuerySources] = useState([])
  const [showSources, setShowSources] = useState(false)
  const ref = useRef()

  useEffect(() => {
    async function fetchDocs() {
      try {
        const res = await fetch(`${API}/api/documents`)
        if (res.ok) {
          const data = await res.json()
          if (data.documents && data.documents.length > 0) {
            setFiles(prev => {
              const merged = [...prev]
              data.documents.forEach(d => {
                if (!merged.some(m => m.name === d.name)) {
                  merged.push({
                    name: d.name,
                    chunks: 'Indexed',
                    date: new Date(d.modified * 1000).toLocaleDateString(),
                    size: (d.size / 1024).toFixed(1) + ' KB'
                  })
                }
              })
              localStorage.setItem('aria_uploaded_files', JSON.stringify(merged))
              return merged
            })
          }
          if (typeof data.total_chunks === 'number') {
            setTotalChunks(data.total_chunks)
          }
        }
      } catch { /* offline / backend fallback */ }
    }
    fetchDocs()
  }, [])

  async function handleUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`${API}/api/upload`, { method: 'POST', body: fd })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.detail || `Upload failed with status ${res.status}`)
      }
      const data = await res.json()
      const newFileEntry = {
        name: file.name,
        chunks: data.chunks_stored || 0,
        date: new Date().toLocaleDateString(),
        size: (file.size / 1024).toFixed(1) + ' KB'
      }
      setFiles(p => {
        const filtered = p.filter(f => f.name !== file.name)
        const updated = [newFileEntry, ...filtered]
        localStorage.setItem('aria_uploaded_files', JSON.stringify(updated))
        return updated
      })
      setTotalChunks(prev => prev + (data.chunks_stored || 0))
      onNotify(`✓ ${file.name} — ${data.chunks_stored || 0} chunks stored in ChromaDB`)
    } catch (err) {
      onNotify(`✗ Upload failed: ${err.message}`)
    } finally {
      setUploading(false)
      if (e.target) e.target.value = ''
    }
  }

  async function handleDeleteFile(fileName) {
    try {
      await fetch(`${API}/api/documents/${encodeURIComponent(fileName)}`, { method: 'DELETE' }).catch(() => {})
      setFiles(prev => {
        const updated = prev.filter(f => f.name !== fileName)
        localStorage.setItem('aria_uploaded_files', JSON.stringify(updated))
        return updated
      })
      onNotify(`✓ Removed ${fileName} from Knowledge Base`)
    } catch (err) {
      onNotify(`✗ Could not delete: ${err.message}`)
    }
  }

  async function handleClearAll() {
    if (!confirm('Are you sure you want to clear all documents from memory?')) return
    try {
      await fetch(`${API}/api/documents/clear`, { method: 'POST' }).catch(() => {})
      setFiles([])
      setTotalChunks(0)
      localStorage.removeItem('aria_uploaded_files')
      onNotify('✓ Knowledge Base cleared')
    } catch (err) {
      onNotify(`✗ Failed to clear: ${err.message}`)
    }
  }

  async function handleMemoryQuery(e) {
    e?.preventDefault()
    if (!queryInput.trim() || queryLoading) return
    setQueryLoading(true)
    setQueryResult(null)
    setQuerySources([])
    try {
      const res = await fetch(`${API}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: queryInput.trim() })
      })
      if (!res.ok) throw new Error(`Query failed: HTTP ${res.status}`)
      const data = await res.json()
      setQueryResult(data.answer)
      setQuerySources(data.sources || [])
    } catch (err) {
      setQueryResult(`✗ Could not retrieve memory: ${err.message}`)
    } finally {
      setQueryLoading(false)
    }
  }

  const card = { background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, padding: 16, marginBottom: 12 }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: '1rem', fontWeight: 600, color: '#111', margin: '0 0 4px' }}>Knowledge Base & RAG Memory</p>
        <p style={{ fontSize: '0.75rem', color: '#737373', margin: 0 }}>
          Manage ingested source documents, test ChromaDB vector retrieval, and inspect vector pipeline parameters.
        </p>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <p style={{ fontSize: 11, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Upload Source Documents</p>
          <span style={{ fontSize: 11, color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ddd6fe', padding: '2px 8px', borderRadius: 12 }}>
            PDF & TXT Supported
          </span>
        </div>
        <p style={{ fontSize: '0.75rem', color: '#737373', marginBottom: 12 }}>
          Files are parsed, recursively chunked, and embedded into local ChromaDB vectors for instant context retrieval.
        </p>
        <button
          onClick={() => ref.current?.click()}
          disabled={uploading}
          style={{
            width: '100%',
            padding: '20px',
            border: '2px dashed #7c3aed',
            borderRadius: 12,
            background: '#fbfbfe',
            color: '#7c3aed',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: uploading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10
          }}
        >
          {uploading ? (
            <>
              <Loader2 size={18} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} /> Ingesting & Embedding Document...
            </>
          ) : (
            <>
              <Paperclip size={16} strokeWidth={2} /> Click to Upload PDF or .TXT File
            </>
          )}
        </button>
        <input ref={ref} type="file" accept=".pdf,.txt" style={{ display: 'none' }} onChange={handleUpload} />
      </div>

      <div style={card}>
        <p style={{ fontSize: 11, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Ask Your Knowledge Base (Semantic Search)</p>
        <p style={{ fontSize: '0.75rem', color: '#737373', marginBottom: 10 }}>
          Test what Aria knows by querying ChromaDB vectors directly with similarity retrieval:
        </p>
        <form onSubmit={handleMemoryQuery} style={{ display: 'flex', gap: 8, marginBottom: queryResult ? 12 : 0 }}>
          <input
            type="text"
            value={queryInput}
            onChange={e => setQueryInput(e.target.value)}
            placeholder="e.g., What are the key points in the uploaded files?"
            style={{
              flex: 1,
              border: '1px solid #e5e5e5',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: '0.85rem',
              outline: 'none',
              background: '#fafafa'
            }}
          />
          <button
            type="submit"
            disabled={!queryInput.trim() || queryLoading}
            style={{
              padding: '10px 18px',
              borderRadius: 8,
              background: '#7c3aed',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: (!queryInput.trim() || queryLoading) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              opacity: (!queryInput.trim() || queryLoading) ? 0.6 : 1
            }}
          >
            {queryLoading ? <Loader2 size={14} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} /> : <SearchIcon size={14} strokeWidth={2} />}
            Search
          </button>
        </form>

        {queryResult && (
          <div style={{ background: '#fbfbfe', border: '1px solid #ddd6fe', borderRadius: 8, padding: 12, marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: '#6d28d9', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Sparkles size={12} strokeWidth={2} /> ChromaDB RAG Answer:
              </span>
              {querySources.length > 0 && (
                <button
                  onClick={() => setShowSources(!showSources)}
                  style={{ background: 'none', border: 'none', color: '#7c3aed', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  {showSources ? <EyeOff size={11} /> : <Eye size={11} />}
                  {showSources ? 'Hide Sources' : `View ${querySources.length} Source Chunks`}
                </button>
              )}
            </div>
            <p style={{ fontSize: '0.85rem', color: '#262626', lineHeight: 1.6, margin: 0 }}>{queryResult}</p>

            {showSources && querySources.length > 0 && (
              <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px dashed #c4b5fd' }}>
                <p style={{ fontSize: 10, color: '#737373', textTransform: 'uppercase', marginBottom: 6 }}>Retrieved Vector Context:</p>
                {querySources.map((src, sIdx) => (
                  <div key={sIdx} style={{ fontSize: '0.75rem', background: '#fff', padding: 8, borderRadius: 6, border: '1px solid #e5e5e5', marginBottom: 6, color: '#404040' }}>
                    <span style={{ color: '#7c3aed', fontWeight: 600 }}>Chunk #{sIdx + 1}: </span>{src}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <p style={{ fontSize: 11, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
            Ingested Documents ({files.length})
          </p>
          {files.length > 0 && (
            <button
              onClick={handleClearAll}
              style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 11, cursor: 'pointer', fontWeight: 500 }}
            >
              Clear All
            </button>
          )}
        </div>

        {files.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: '#a3a3a3' }}>
            <p style={{ fontSize: 32, marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
              <FolderIcon size={36} strokeWidth={1.5} color="#a3a3a3" />
            </p>
            <p style={{ fontSize: '0.85rem', color: '#737373', margin: '0 0 4px' }}>No documents uploaded yet</p>
            <p style={{ fontSize: '0.75rem', color: '#a3a3a3', margin: 0 }}>
              Uploaded PDF and TXT documents will be listed here and indexed into memory.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {files.map((f, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#fafafa',
                  border: '1px solid #e5e5e5',
                  borderRadius: 10,
                  padding: '10px 14px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <FileText size={16} strokeWidth={1.5} color="#7c3aed" />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 500, color: '#111', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.name}
                    </p>
                    <p style={{ fontSize: 11, color: '#a3a3a3', margin: '2px 0 0' }}>
                      {f.size ? `${f.size} · ` : ''}{f.date}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '3px 8px', borderRadius: 16 }}>
                    {typeof f.chunks === 'number' ? `${f.chunks} chunks` : f.chunks}
                  </span>
                  <button
                    onClick={() => handleDeleteFile(f.name)}
                    style={{ background: 'none', border: 'none', color: '#a3a3a3', cursor: 'pointer', padding: 4 }}
                    title="Delete document"
                  >
                    <Trash2 size={13} strokeWidth={2} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={card}>
        <p style={{ fontSize: 11, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
          Vector Storage & RAG Context
        </p>
        {[
          ['Vector Database', 'ChromaDB (Local Persistent)'],
          ['Total Chunks Indexed', `${totalChunks} vectors in ChromaDB`],
          ['Collection Name', 'research_notes'],
          ['Embedding Model', 'SentenceTransformer (all-MiniLM-L6-v2)'],
          ['Embedding Dimension', '384 Dimensions'],
          ['Text Splitter', 'RecursiveCharacterTextSplitter'],
          ['Chunking Parameters', `${chunkSize || 500} chars / ${chunkOverlap || 50} overlap`],
          ['Retrieval Strategy', 'Top-3 Semantic Nearest Neighbors'],
          ['Persistent Path', 'Backend/chroma_store']
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

function ReportsTab({ sessions, model }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [expandedIndex, setExpandedIndex] = useState(null)
  const [copiedIndex, setCopiedIndex] = useState(null)

  const allReports = []
  sessions.forEach(session => {
    session.messages.forEach((msg, idx) => {
      if (msg.role === 'agent' && msg.text && !msg.loading) {
        const prevUserMsg = idx > 0 ? session.messages[idx - 1] : null
        const topic = prevUserMsg?.text || session.title || 'Research Report'
        const isDeep = (msg.steps && msg.steps.some(s => s.toLowerCase().includes('crew') || s.toLowerCase().includes('analyst'))) ||
                       (prevUserMsg && prevUserMsg.text?.toLowerCase().startsWith('deep research:'))
        allReports.push({
          id: `${session.id}_${idx}`,
          topic,
          text: msg.text,
          steps: msg.steps || [],
          isDeep,
          projectName: session.projectName,
          sessionTitle: session.title,
          timestamp: session.id
        })
      }
    })
  })
  allReports.reverse()

  const filteredReports = allReports.filter(rep => {
    const matchesSearch = !searchQuery.trim() ||
      rep.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rep.text.toLowerCase().includes(searchQuery.toLowerCase())
    if (!matchesSearch) return false
    if (filterType === 'deep') return rep.isDeep
    if (filterType === 'fast') return !rep.isDeep
    return true
  })

  function downloadReport(text, topic, format = 'md') {
    const filename = `${topic.slice(0, 30).replace(/[^a-zA-Z0-9_-]/g, '_')}_report.${format}`
    const content = format === 'md'
      ? `# Research Report: ${topic}

${text}`
      : `Research Report: ${topic}
${'='.repeat(50)}

${text}`
    const blob = new Blob([content], { type: format === 'md' ? 'text/markdown' : 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
  }

  function copyReport(text, index) {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const card = { background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, padding: 16, marginBottom: 12 }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: '1rem', fontWeight: 600, color: '#111', margin: '0 0 4px' }}>Research Reports & Syntheses</p>
        <p style={{ fontSize: '0.75rem', color: '#737373', margin: 0 }}>
          Export, read, and inspect research syntheses generated across sessions by Aria and the CrewAI multi-agent pipeline.
        </p>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', background: '#fafafa', border: '1px solid #e5e5e5', borderRadius: 8, padding: '6px 12px' }}>
            <SearchIcon size={14} color="#a3a3a3" style={{ marginRight: 8, flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search reports by topic or keyword..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.8rem', width: '100%', color: '#262626' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a3a3a3', padding: 2 }}>
                <X size={12} />
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { id: 'all', label: `All (${allReports.length})` },
              { id: 'deep', label: `CrewAI Deep (${allReports.filter(r => r.isDeep).length})` },
              { id: 'fast', label: `Fast (${allReports.filter(r => !r.isDeep).length})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 16,
                  border: filterType === tab.id ? '1px solid #7c3aed' : '1px solid #e5e5e5',
                  background: filterType === tab.id ? '#f5f3ff' : '#fff',
                  color: filterType === tab.id ? '#7c3aed' : '#525252',
                  fontSize: '0.75rem',
                  fontWeight: filterType === tab.id ? 600 : 400,
                  cursor: 'pointer'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={card}>
        <p style={{ fontSize: 11, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
          Archived Reports ({filteredReports.length})
        </p>

        {filteredReports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#a3a3a3' }}>
            <p style={{ fontSize: 32, marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
              <FileText size={40} strokeWidth={1.5} color="#a3a3a3" />
            </p>
            <p style={{ fontSize: '0.85rem', color: '#737373', margin: '0 0 4px' }}>
              {allReports.length === 0 ? 'No reports generated yet.' : 'No reports matching search query.'}
            </p>
            <p style={{ fontSize: '0.75rem', color: '#a3a3a3', margin: 0 }}>
              Ask Aria a research topic or start a Deep Research query in chat to create reports.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredReports.map((rep, i) => {
              const isExpanded = expandedIndex === i
              return (
                <div
                  key={rep.id}
                  style={{
                    background: '#fff',
                    border: '1px solid #e5e5e5',
                    borderRadius: 10,
                    padding: 14,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span
                          style={{
                            fontSize: 10,
                            padding: '2px 8px',
                            borderRadius: 12,
                            fontWeight: 600,
                            background: rep.isDeep ? '#f5f3ff' : '#f0fdf4',
                            color: rep.isDeep ? '#6d28d9' : '#166534',
                            border: rep.isDeep ? '1px solid #c4b5fd' : '1px solid #bbf7d0'
                          }}
                        >
                          {rep.isDeep ? '🤖 CrewAI 3-Agent' : '⚡ Single Agent'}
                        </span>
                        {rep.projectName && (
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, background: '#f3f4f6', color: '#4b5563', border: '1px solid #e5e5e5' }}>
                            📁 {rep.projectName}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#111', margin: 0 }}>
                        {rep.topic.slice(0, 120)}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={() => copyReport(rep.text, i)}
                        style={{
                          fontSize: '0.75rem',
                          color: copiedIndex === i ? '#16a34a' : '#525252',
                          border: '1px solid #e5e5e5',
                          background: '#fff',
                          borderRadius: 6,
                          padding: '5px 10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                        title="Copy to clipboard"
                      >
                        {copiedIndex === i ? <Check size={12} strokeWidth={2} /> : <Copy size={12} strokeWidth={2} />}
                        {copiedIndex === i ? 'Copied' : 'Copy'}
                      </button>

                      <button
                        onClick={() => downloadReport(rep.text, rep.topic, 'md')}
                        style={{
                          fontSize: '0.75rem',
                          color: '#7c3aed',
                          border: '1px solid #c4b5fd',
                          background: '#fbfbfe',
                          borderRadius: 6,
                          padding: '5px 10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontWeight: 500
                        }}
                        title="Download as Markdown"
                      >
                        <Download size={12} strokeWidth={2} /> .md
                      </button>

                      <button
                        onClick={() => downloadReport(rep.text, rep.topic, 'txt')}
                        style={{
                          fontSize: '0.75rem',
                          color: '#525252',
                          border: '1px solid #e5e5e5',
                          background: '#fff',
                          borderRadius: 6,
                          padding: '5px 10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                        title="Download as Text"
                      >
                        <Download size={12} strokeWidth={2} /> .txt
                      </button>
                    </div>
                  </div>

                  {isExpanded ? (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
                      <SafeMarkdown text={rep.text} />
                      {rep.steps?.length > 0 && <StepList steps={rep.steps} />}
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.8rem', color: '#666', lineHeight: 1.5, margin: '6px 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {rep.text}
                    </p>
                  )}

                  <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      onClick={() => setExpandedIndex(isExpanded ? null : i)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#7c3aed',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      {isExpanded ? <>Hide Full View <ChevronUp size={13} /></> : <>Read Full Report <ChevronDown size={13} /></>}
                    </button>
                    <span style={{ fontSize: 11, color: '#a3a3a3' }}>Session: {rep.sessionTitle}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={card}>
        <p style={{ fontSize: 11, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
          Report Synthesis Architecture
        </p>
        {[
          ['Multi-Agent Orchestrator', 'CrewAI (Sequential Process)'],
          ['Agent 1 — Senior Researcher', 'Tavily Search API (Multi-query live internet extraction)'],
          ['Agent 2 — Data Analyst', 'Quantitative filtering, deduplication, cross-validation'],
          ['Agent 3 — Technical Writer', 'Format-targeted report structuring & executive synthesis'],
          ['Default Model', 'Groq ' + (model || 'openai/gpt-oss-120b')],
          ['Fast Mode Engine', 'LangChain Single Agent + Tavily Tools'],
          ['Ingestion Output', 'Auto-chunked & stored in ChromaDB memory layer']
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

function SettingsTab({ model, onModelChange, chunks, onChunksChange, overlap, onOverlapChange, onNotify }) {
  const [saved, setSaved] = useState(false)
  const savedTimer = useRef(null)

  async function save() {
    setSaved(true)
    if (savedTimer.current) clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => { setSaved(false); savedTimer.current = null }, 2000)

    try {
      await fetch(`${API}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          chunk_size: chunks,
          chunk_overlap: overlap
        })
      })
      onNotify?.('✓ Settings saved and synced with backend')
    } catch {
      onNotify?.('✓ Settings saved locally')
    }
  }

  const card = { background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, padding: 16, marginBottom: 12 }
  const label = { fontSize: '0.75rem', color: '#525252', display: 'block', marginBottom: 4 }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: '1rem', fontWeight: 600, color: '#111', margin: '0 0 4px' }}>Agent & Model Settings</p>
        <p style={{ fontSize: '0.75rem', color: '#737373', margin: 0 }}>
          Configure LLM inference models, vector chunking parameters, and runtime behavior.
        </p>
      </div>

      <div style={card}>
        <p style={{ fontSize: 11, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>LLM Engine</p>
        <label style={label}>Primary Model (Groq Inference API)</label>
        <select value={model} onChange={e => onModelChange(e.target.value)} style={{ width: '100%', border: '1px solid #e5e5e5', borderRadius: 8, padding: '10px 12px', fontSize: '0.875rem', background: '#fff', outline: 'none' }}>
          <option value="openai/gpt-oss-120b">openai/gpt-oss-120b (default)</option>
          <option value="qwen/qwen3.8-27b">qwen/qwen3.8-27b</option>
          <option value="openai/gpt-oss-20b">openai/gpt-oss-20b (fast)</option>
        </select>
      </div>

      <div style={card}>
        <p style={{ fontSize: 11, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>RAG Chunking Pipeline</p>
        {[
          ['Chunk size (characters)', chunks, onChunksChange, 100, 1000, 50],
          ['Chunk overlap (characters)', overlap, onOverlapChange, 0, 200, 10]
        ].map(([lbl, val, set, min, max, step]) => (
          <div key={lbl} style={{ marginBottom: 12 }}>
            <label style={label}>{lbl}: <strong>{val}</strong></label>
            <input type="range" min={min} max={max} step={step} value={val} onChange={e => set(Number(e.target.value))} style={{ width: '100%', accentColor: '#7c3aed' }} />
          </div>
        ))}
      </div>

      <button onClick={save} style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: saved ? '#22c55e' : '#7c3aed', color: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Check size={14} strokeWidth={2} /> {saved ? 'Settings Saved & Synced!' : 'Save Settings'}
      </button>

      <div style={{ ...card, marginTop: 12 }}>
        <p style={{ fontSize: 11, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Stack & System Architecture</p>
        {[
          ['Frontend', 'React 19 + Vite 8 + Tailwind v4'],
          ['Backend', 'FastAPI + Python 3.12'],
          ['Active LLM', 'Groq ' + model],
          ['Memory Store', 'ChromaDB (Local persistent)'],
          ['Multi-Agent Orchestrator', 'CrewAI (3-Agent sequential)'],
          ['Web Search Tool', 'Tavily Search API']
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
function ProjectModal({ session, onSave, onClear, onClose }) {
  const [name, setName] = useState(session?.projectName || '')
  const [description, setDescription] = useState(session?.projectDescription || '')

  function handleSave() {
    onSave({ projectName: name.trim() || null, projectDescription: description.trim() || null })
    onClose()
  }

  function handleClear() {
    if (onClear) onClear(); else onSave({ projectName: null, projectDescription: null });
    onClose();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#111', margin: 0 }}>Project Context</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#a3a3a3', padding: 4 }}><X size={20} strokeWidth={2} /></button>
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
  const [searchQuery, setSearchQuery] = useState('')
  const [projectModalOpen, setProjectModalOpen] = useState(false)
   
  const [activeMenuId, setActiveMenuId] = useState(null)

  const [settingsModel, setSettingsModel] = useState(() => localStorage.getItem('aria_model') || 'qwen/qwen3.8-27b')
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
    setSearchQuery('')
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

  function handleProjectSave(projectData, maybeDesc) {
    const pName = (typeof projectData === 'object' && projectData !== null)
      ? (projectData.projectName || '')
      : (projectData || '')
    const pDesc = (typeof projectData === 'object' && projectData !== null)
      ? (projectData.projectDescription || '')
      : (maybeDesc || '')
    const cleanName = typeof pName === 'string' ? pName.trim() : ''
    const cleanDesc = typeof pDesc === 'string' ? pDesc.trim() : ''
    setSessions(prev => prev.map(s => 
      s.id === activeId ? { ...s, projectName: cleanName || null, projectDescription: cleanDesc || null } : s
    ))
    closeProjectModal()
    notify(`✓ Project context set: ${cleanName || '(cleared)'}`)
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
        let detail = `Upload failed with status ${fRes.status}`;
        try {
          const error = await fRes.json();
          detail = error.detail || detail;
        } catch {
          // Keep the HTTP status when the server does not return JSON.
        }
        throw new Error(detail);
      }
      
      const d = await fRes.json();
      steps.push(`✓ ${fileObj.name} — ${d.chunks_stored || 0} chunks stored`);
    }

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
      if (!r.ok) {
        let detail = `HTTP ${r.status}`;
        try {
          const error = await r.json();
          detail = error.detail || detail;
        } catch {
          // Keep the HTTP status when the server does not return JSON.
        }
        throw new Error(detail);
      }
      const d = await r.json();
      report = d.answer || d.report || '';
      steps = [...steps, ...(d.steps || [])];
      followupQuestions = d.followup_questions || [];
    } else if (currentAttachments.length > 0) {
      report = `I've processed your files successfully and saved them to my RAG memory layer! \n\n${currentAttachments.map(f => `• **${f.name}**`).join('\n')}\n\nWhat would you like me to analyze or look up from these documents, bro? 📊`;
    }
    
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
    { id: 'chat',      label: 'Chat',           icon: <MsgSquare size={14} strokeWidth={2} /> },
    { id: 'knowledge', label: 'Knowledge Base',  icon: <FolderIcon size={14} strokeWidth={2} /> },
    { id: 'reports',   label: 'Reports',         icon: <FileText size={14} strokeWidth={2} /> },
    { id: 'settings',  label: 'Settings',        icon: <SettingsIcon size={14} strokeWidth={2} /> },
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
            <Plus size={14} strokeWidth={2} /> New chat
          </button>
        </div>
        
        <div style={{ padding: '0 14px 6px' }}>
          <button onClick={openProjectModal} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', borderRadius: 10, border: '1px solid #e5e5e5', background: '#fff', color: '#525252', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' }}>
            <FolderIcon size={14} strokeWidth={2} /> Project
            {activeSession.projectName && <span style={{ background: '#7c3aed', color: '#fff', fontSize: '0.65rem', padding: '2px 6px', borderRadius: 10, fontWeight: 600, marginLeft: 4 }}>{activeSession.projectName.slice(0, 12)}</span>}
          </button>
        </div>
        
        <nav style={{ padding: '6px 0' }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', background: activeTab === item.id ? '#fff' : 'transparent', color: activeTab === item.id ? '#7c3aed' : '#525252', fontSize: '0.9rem', fontWeight: activeTab === item.id ? 600 : 400, border: 'none', borderRight: activeTab === item.id ? '3px solid #7c3aed' : '3px solid transparent', cursor: 'pointer', textAlign: 'left' }}>
              {item.icon}{item.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: '4px 14px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #e5e5e5', borderRadius: '8px', padding: '4px 10px', width: '100%' }}>
            <span style={{ fontSize: '0.85rem', color: '#a3a3a3', marginRight: '6px', userSelect: 'none' }}><SearchIcon size={14} strokeWidth={2} /></span>
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
                <X size={12} strokeWidth={2} />
              </button>
            )}
          </div>
        </div>
        
        <div style={{ padding: '6px 20px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: 10, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Recent Chats</p>
          <button onClick={() => { const s = createSession('Welcome'); setSessions([s]); setActiveId(s.id); localStorage.removeItem('aria_sessions'); setChatInputText(''); setSearchQuery('') }}
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
                  <button 
                    onClick={() => { setActiveId(s.id); setActiveTab('chat') }}
                    style={{ flex: 1, textAlign: 'left', fontSize: '0.8rem', color: s.id === activeId && activeTab === 'chat' ? '#7c3aed' : '#6b7280', border: 'none', fontWeight: s.id === activeId && activeTab === 'chat' ? 600 : 400, background: 'transparent', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '6px 0' }}
                  >
                    {s.isPinned ? <Pin size={14} strokeWidth={2} /> : <FolderIcon size={14} strokeWidth={2} />} {s.title}
                  </button>

                  <button 
                    onClick={(e) => { e.stopPropagation(); setActiveMenuId(isMenuOpen ? null : s.id) }}
                    style={{ background: 'none', border: 'none', color: '#a3a3a3', cursor: 'pointer', fontSize: '1rem', padding: '4px 8px', fontWeight: 'bold' }}
                  >
                    <MoreHorizontal size={14} strokeWidth={2} />
                  </button>

                  {isMenuOpen && (
                    <div style={{ position: 'absolute', top: '28px', right: '10px', background: '#fff', border: '1px solid #e5e5e5', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 100, display: 'flex', flexDirection: 'column', padding: '4px', minWidth: '110px' }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); handlePinSession(s.id); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', fontSize: '0.75rem', color: '#404040', background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', borderRadius: '4px' }}
                      >
                        <Pin size={14} strokeWidth={2} /> {s.isPinned ? 'Unpin' : 'Pin'}
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); handleRenameSession(s.id); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', fontSize: '0.75rem', color: '#404040', background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', borderRadius: '4px' }}
                      >
                        <Edit size={14} strokeWidth={2} /> Rename
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); handleDeleteSession(s.id); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', fontSize: '0.75rem', color: '#ef4444', background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', borderRadius: '4px' }}
                      >
                        <Trash2 size={14} strokeWidth={2} /> Delete
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
          onClear={handleProjectClear} 
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
                <FolderIcon size={14} strokeWidth={2} /> {activeSession.projectName}
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
          <div style={{ margin: '8px 20px 0', padding: '6px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, fontSize: 11, color: '#92400e' }}><AlertTriangle size={12} strokeWidth={2} /> 70k+ tokens used today</div>
        )}
        {stats.token_status === 'critical' && (
          <div style={{ margin: '8px 20px 0', padding: '6px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, fontSize: 11, color: '#991b1b' }}><AlertCircle size={12} strokeWidth={2} /> Near daily token limit</div>
        )}
        {notification && (
          <div style={{ margin: '8px 20px 0', padding: '8px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, fontSize: '0.75rem', color: '#166534', flexShrink: 0 }}>{notification}</div>
        )}

        {activeTab === 'chat' && (
          <>
            {isHome ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px 48px' }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                  <div style={{ fontSize: '3rem', marginBottom: 12 }}>🤖✨</div>
                  <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: '#111', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
                    {getGreeting()}, Bro! 👋
                  </h1>
                  <p style={{ fontSize: '1.15rem', color: '#7c3aed', fontWeight: 600, margin: '0 0 8px' }}>
                    I'm <span style={{ color: '#111' }}>Aria</span> — your AI research buddy 🚀
                  </p>
                  <p style={{ fontSize: '0.95rem', color: '#737373', margin: 0 }}>
                    Ask me anything 💡 Deep dive into any topic 🔬 Or just say hi! 😊
                  </p>
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
                      {a.icon}{a.label}
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

        {activeTab === 'knowledge' && (
          <KnowledgeBaseTab
            onNotify={notify}
            chunkSize={chunkSize}
            chunkOverlap={chunkOverlap}
          />
        )}
        {activeTab === 'reports' && (
          <ReportsTab
            sessions={sessions}
            model={settingsModel}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsTab
            model={settingsModel}
            onModelChange={setSettingsModel}
            chunks={chunkSize}
            onChunksChange={setChunkSize}
            overlap={chunkOverlap}
            onOverlapChange={setChunkOverlap}
            onNotify={notify}
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
            { name: 'Researcher', icon: <Bot size={12} strokeWidth={2} /> },
            { name: 'Writer', icon: <Mic size={12} strokeWidth={2} /> },
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