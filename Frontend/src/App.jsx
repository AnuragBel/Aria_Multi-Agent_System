import { useState, useEffect, useRef } from 'react'

const API = 'http://localhost:8000'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Good night'
}

function StatusDot({ active }) {
  return <span className={`inline-block w-2 h-2 rounded-full mr-2 ${active ? 'bg-green-500' : 'bg-neutral-300'}`} />
}

function StepList({ steps }) {
  return (
    <ul className="mt-3 space-y-1 border-t border-neutral-100 pt-3">
      {steps.map((step, i) => (
        <li key={i} className="flex items-start gap-2 text-xs text-neutral-500">
          <span className="text-green-500 mt-0.5 shrink-0">✓</span>
          <span>{step}</span>
        </li>
      ))}
    </ul>
  )
}

function UserBubble({ text, files }) {
  return (
    <div className="flex justify-end gap-2 items-start">
      <div className="max-w-[75%] space-y-1">
        {files?.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-end mb-1">
            {files.map((f, i) => (
              <span key={i} className="text-[11px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full border border-violet-200">
                📎 {f.name}
              </span>
            ))}
          </div>
        )}
        <div className="bg-violet-600 text-white text-sm px-4 py-2.5 rounded-2xl rounded-tr-sm leading-relaxed">
          {text}
        </div>
      </div>
      <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-medium shrink-0 mt-0.5">
        AB
      </div>
    </div>
  )
}

function AgentBubble({ text, steps, loading }) {
  return (
    <div className="flex gap-2 items-start">
      <div className="w-7 h-7 rounded-full border border-neutral-200 bg-white flex items-center justify-center text-sm shrink-0 mt-0.5">
        🤖
      </div>
      <div className="max-w-[80%] bg-white border border-neutral-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        {loading ? (
          <div className="flex gap-1 items-center py-1 px-1">
            <span className="w-2 h-2 rounded-full bg-neutral-300 animate-bounce [animation-delay:0ms]" />
            <span className="w-2 h-2 rounded-full bg-neutral-300 animate-bounce [animation-delay:150ms]" />
            <span className="w-2 h-2 rounded-full bg-neutral-300 animate-bounce [animation-delay:300ms]" />
          </div>
        ) : (
          <>
            <p className="text-sm text-neutral-800 leading-relaxed whitespace-pre-wrap">{text}</p>
            {steps?.length > 0 && <StepList steps={steps} />}
          </>
        )}
      </div>
    </div>
  )
}

function createSession(title = 'New chat') {
  return { id: Date.now(), title, messages: [] }
}

function KnowledgeBaseTab({ onNotify }) {
  const [uploading, setUploading] = useState(false)
  const [uploadedFiles, setFiles] = useState([])
  const fileRef = useRef()

  async function handleUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`${API}/api/upload`, { method: 'POST', body: formData })
      const data = await res.json()
      setFiles(prev => [...prev, { name: file.name, chunks: data.chunks_stored, date: new Date().toLocaleDateString() }])
      onNotify(`✓ ${file.name} added — ${data.chunks_stored} chunks stored`)
    } catch (err) {
      onNotify(`✗ Upload failed: ${err.message}`)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      <div>
        <h2 className="text-sm font-medium text-neutral-800 mb-1">Upload to Memory</h2>
        <p className="text-xs text-neutral-500 mb-3">PDF or .txt files get chunked and stored in ChromaDB.</p>
        <button onClick={() => fileRef.current.click()} disabled={uploading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed border-neutral-300
            text-sm text-neutral-500 hover:border-violet-400 hover:text-violet-600 transition-colors
            disabled:opacity-50 w-full justify-center">
          {uploading ? '⏳ Uploading...' : '📎 Click to upload PDF or .txt'}
        </button>
        <input ref={fileRef} type="file" accept=".pdf,.txt" className="hidden" onChange={handleUpload} />
      </div>
      {uploadedFiles.length === 0 ? (
        <div className="text-center py-10 text-neutral-400">
          <p className="text-3xl mb-2">🗄️</p>
          <p className="text-sm">No documents uploaded yet</p>
        </div>
      ) : uploadedFiles.map((f, i) => (
        <div key={i} className="flex items-center justify-between bg-white border border-neutral-200 rounded-xl px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span>📄</span>
            <div>
              <p className="text-xs font-medium text-neutral-800">{f.name}</p>
              <p className="text-[11px] text-neutral-400">{f.date}</p>
            </div>
          </div>
          <span className="text-[11px] text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">{f.chunks} chunks</span>
        </div>
      ))}
    </div>
  )
}

function ReportsTab({ sessions }) {
  const allReports = sessions.flatMap(s => s.messages.filter(m => m.role === 'agent' && m.text && !m.loading)).reverse()
  function download(text, i) {
    const blob = new Blob([`Report #${i + 1}\n${'='.repeat(50)}\n\n${text}`], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `report_${i + 1}.txt`
    a.click()
  }
  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-3">
      <h2 className="text-sm font-medium text-neutral-800 mb-3">Reports ({allReports.length})</h2>
      {allReports.length === 0 ? (
        <div className="text-center py-10 text-neutral-400">
          <p className="text-3xl mb-2">📄</p>
          <p className="text-sm">No reports yet. Research a topic first.</p>
        </div>
      ) : allReports.map((msg, i) => (
        <div key={i} className="bg-white border border-neutral-200 rounded-xl p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="text-xs font-medium text-neutral-700 line-clamp-2">{msg.text?.slice(0, 80)}...</p>
            <button onClick={() => download(msg.text, i)}
              className="text-[11px] shrink-0 text-violet-600 hover:text-violet-800 border border-violet-200 px-2 py-0.5 rounded-lg">
              ↓ Save
            </button>
          </div>
          <p className="text-[11px] text-neutral-400">Report #{allReports.length - i}</p>
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
  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-4">
      <h2 className="text-sm font-medium text-neutral-800">Settings</h2>
      <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-4">
        <p className="text-xs text-neutral-400 uppercase tracking-wide">LLM</p>
        <div>
          <label className="text-xs text-neutral-600 block mb-1">Model</label>
          <select value={model} onChange={e => setModel(e.target.value)}
            className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-400">
            <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile</option>
            <option value="llama3-70b-8192">llama3-70b-8192</option>
            <option value="llama-3.1-8b-instant">llama-3.1-8b-instant</option>
          </select>
        </div>
      </div>
      <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-4">
        <p className="text-xs text-neutral-400 uppercase tracking-wide">RAG</p>
        <div>
          <label className="text-xs text-neutral-600 block mb-1">Chunk size: <span className="font-medium">{chunks}</span></label>
          <input type="range" min="100" max="1000" step="50" value={chunks} onChange={e => setChunks(Number(e.target.value))} className="w-full" />
        </div>
        <div>
          <label className="text-xs text-neutral-600 block mb-1">Overlap: <span className="font-medium">{overlap}</span></label>
          <input type="range" min="0" max="200" step="10" value={overlap} onChange={e => setOverlap(Number(e.target.value))} className="w-full" />
        </div>
      </div>
      <button onClick={save}
        className={`w-full py-2 rounded-xl text-sm font-medium transition-colors ${saved ? 'bg-green-500 text-white' : 'bg-violet-600 hover:bg-violet-700 text-white'}`}>
        {saved ? '✓ Saved!' : 'Save Settings'}
      </button>
    </div>
  )
}

const quickActions = [
  { label: 'Research',  icon: '🔍', prompt: 'Research ' },
  { label: 'Summarize', icon: '📝', prompt: 'Summarize ' },
  { label: 'Explain',   icon: '💡', prompt: 'Explain '  },
  { label: 'Compare',   icon: '⚖️',  prompt: 'Compare '  },
  { label: 'Analyze',   icon: '📊', prompt: 'Analyze '  },
]

function InputBox({ onSend, loading, initialValue = '', autoFocus = false }) {
  const [input, setInput]           = useState(initialValue)
  const [attachments, setAttachments] = useState([])
  const fileRef                     = useRef()
  const textareaRef                 = useRef()

  useEffect(() => { if (autoFocus) textareaRef.current?.focus() }, [autoFocus])

  function handleInput(e) {
    setInput(e.target.value)
    const ta = textareaRef.current
    if (ta) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 160) + 'px' }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  function handleFile(e) {
    setAttachments(prev => [...prev, ...Array.from(e.target.files)])
    e.target.value = ''
  }

  function removeAttach(i) { setAttachments(prev => prev.filter((_, idx) => idx !== i)) }

  function send() {
    if ((!input.trim() && attachments.length === 0) || loading) return
    onSend(input.trim(), attachments)
    setInput('')
    setAttachments([])
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  return (
    <div className="w-full">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {attachments.map((f, i) => (
            <div key={i} className="flex items-center gap-1 bg-violet-50 border border-violet-200 text-violet-700 text-xs px-2 py-1 rounded-lg">
              <span>{f.type.startsWith('image/') ? '🖼️' : '📄'}</span>
              <span className="max-w-30 truncate">{f.name}</span>
              <button onClick={() => removeAttach(i)} className="text-violet-400 hover:text-violet-700 ml-0.5">✕</button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 items-end bg-white border border-neutral-200 rounded-2xl px-3 py-2 focus-within:border-violet-400 transition-colors shadow-sm">
        <button onClick={() => fileRef.current.click()}
          className="text-neutral-400 hover:text-violet-600 transition-colors p-1 shrink-0 self-end mb-0.5 text-lg"
          title="Attach file" aria-label="Attach file">+</button>
        <input ref={fileRef} type="file" accept="image/*,.pdf,.txt" multiple className="hidden" onChange={handleFile} />
        <textarea ref={textareaRef} value={input} onChange={handleInput} onKeyDown={handleKey}
          placeholder="Ask anything or enter a research topic..."
          rows={1} disabled={loading}
          className="flex-1 resize-none outline-none text-sm leading-relaxed bg-transparent
            text-neutral-800 placeholder-neutral-400 disabled:opacity-50 py-1 max-h-40" />
        <button onClick={send} disabled={loading || (!input.trim() && attachments.length === 0)}
          className="w-8 h-8 rounded-xl bg-violet-600 hover:bg-violet-700 text-white flex items-center
            justify-center shrink-0 disabled:opacity-30 disabled:cursor-not-allowed transition-colors self-end text-sm"
          aria-label="Send">↑</button>
      </div>
      <p className="text-[10px] text-neutral-400 mt-1.5 text-center">Enter to send · Shift+Enter for new line · + to attach</p>
    </div>
  )
}

export default function App() {
  const [sessions, setSessions] = useState(() => {
    try {
      const saved = localStorage.getItem('aria_sessions')
      return saved ? JSON.parse(saved) : [createSession('Welcome')]
    } catch {
      return [createSession('Welcome')]
    }
  })

  const [activeId, setActiveId] = useState(() => {
    try {
      const savedId = localStorage.getItem('aria_active_id')
      return savedId ? Number(savedId) : (sessions[0]?.id || Date.now())
    } catch {
      return sessions[0]?.id || Date.now()
    }
  })

  // Save sessions to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem('aria_sessions', JSON.stringify(sessions))
    } catch (_) {}
  }, [sessions])

  // Save active session ID
  useEffect(() => {
    try {
      localStorage.setItem('aria_active_id', activeId)
    } catch (_) {}
  }, [activeId])

  const [activeTab, setActiveTab]     = useState('chat')
  const [loading, setLoading]         = useState(false)
  const [stats, setStats]             = useState({ searches: 0, chunks_stored: 0, reports: 0, tokens_used: '0.0k' })
  const [notification, setNotification] = useState('')
  const bottomRef                     = useRef()

  const activeSession = sessions.find(s => s.id === activeId) || sessions[0] || { messages: [] }
  const isHome        = !activeSession.messages || activeSession.messages.length === 0

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [activeSession?.messages, loading])
  useEffect(() => { fetchStats(); const t = setInterval(fetchStats, 5000); return () => clearInterval(t) }, [])

  async function fetchStats() {
    try { const res = await fetch(`${API}/api/stats`); setStats(await res.json()) } catch (_) {}
  }

  function notify(msg) { setNotification(msg); setTimeout(() => setNotification(''), 3000) }

  function newChat() {
    const s = createSession('New chat')
    setSessions(prev => [s, ...prev])
    setActiveId(s.id)
    setActiveTab('chat')
  }

  function updateSession(id, updater) {
    setSessions(prev => prev.map(s => s.id === id ? updater(s) : s))
  }

  async function handleSend(text, files) {
    if ((!text && files.length === 0) || loading) return

    const userMsg    = { role: 'user', text: text || '(file attached)', files: files.map(f => ({ name: f.name, type: f.type })) }
    const loadingMsg = { role: 'agent', loading: true }

    updateSession(activeId, s => ({
      ...s,
      title: s.title === 'New chat' || s.title === 'Welcome' ? (text.slice(0, 30) || s.title) : s.title,
      messages: [...(s.messages || []), userMsg, loadingMsg]
    }))
    setLoading(true)

    try {
      let report = '', steps = []

      const pdfFiles = files.filter(f => f.type === 'application/pdf' || f.name?.endsWith('.txt'))
      for (const pdfFile of pdfFiles) {
        const form = new FormData(); form.append('file', pdfFile)
        try {
          const res = await fetch(`${API}/api/upload`, { method: 'POST', body: form })
          const data = await res.json()
          steps.push(`✓ ${pdfFile.name} stored — ${data.chunks_stored} chunks`)
        } catch { steps.push(`✗ Failed to store ${pdfFile.name}`) }
      }

      if (text) {
        const res  = await fetch(`${API}/api/research`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: text })
        })
        const data = await res.json()
        report = data.report
        steps  = [...steps, ...(data.steps || [])]
      } else if (pdfFiles.length > 0) {
        report = `Stored in memory:\n${pdfFiles.map(f => `• ${f.name}`).join('\n')}\n\nAsk me anything about these documents!`
      }

      updateSession(activeId, s => {
        const msgs = [...(s.messages || [])]
        if (msgs.length > 0) {
          msgs[msgs.length - 1] = { role: 'agent', text: report, steps }
        }
        return { ...s, messages: msgs }
      })
      fetchStats()
    } catch (err) {
      updateSession(activeId, s => {
        const msgs = [...(s.messages || [])]
        if (msgs.length > 0) {
          msgs[msgs.length - 1] = { role: 'agent', text: `Error: ${err.message}\n\nMake sure backend is running:\nuvicorn main:app --reload --port 8000` }
        }
        return { ...s, messages: msgs }
      })
    } finally { setLoading(false) }
  }

  const navItems = [
    { id: 'chat',       label: 'Chat',           icon: '💬' },
    { id: 'knowledge', label: 'Knowledge Base',  icon: '🗄️' },
    { id: 'reports',   label: 'Reports',         icon: '📄' },
    { id: 'settings',  label: 'Settings',        icon: '⚙️' },
  ]

  return (
    <div className="flex h-screen bg-neutral-100 font-sans overflow-hidden text-neutral-900">

      {/* ── LEFT SIDEBAR ──────────────────────────────────── */}
      <aside className="w-64 bg-neutral-50 border-r border-neutral-200 flex flex-col shrink-0">
        <div className="px-4 py-4 border-b border-neutral-200 flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
            A
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-800">Aria</p>
            <p className="text-[10px] text-neutral-400">Powered by Groq · CrewAI</p>
          </div>
        </div>

        <div className="px-3 pt-3 pb-1">
          <button onClick={newChat}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl
              border border-neutral-200 bg-white hover:bg-violet-50 hover:border-violet-300
              text-xs text-neutral-600 hover:text-violet-700 transition-colors font-medium">
            ✏️ New chat
          </button>
        </div>

        <nav className="py-1">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors
                ${activeTab === item.id
                  ? 'bg-white text-neutral-900 font-medium border-r-2 border-violet-500'
                  : 'text-neutral-500 hover:bg-white hover:text-neutral-800'}`}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>

        {/* Updated Recent section layout with Clear History option */}
        <div className="px-4 pt-3 pb-1 flex items-center justify-between">
          <p className="text-[10px] text-neutral-400 uppercase tracking-wide">Recent</p>
          <button
            onClick={() => {
              const fresh = createSession('Welcome')
              setSessions([fresh])
              setActiveId(fresh.id)
              localStorage.clear()
            }}
            className="text-[10px] text-neutral-400 hover:text-red-500 transition-colors">
            Clear
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {sessions.map(s => (
            <button key={s.id} onClick={() => { setActiveId(s.id); setActiveTab('chat') }}
              className={`w-full text-left px-4 py-1.5 text-xs truncate transition-colors
                ${s.id === activeId && activeTab === 'chat'
                  ? 'text-violet-700 font-medium bg-violet-50'
                  : 'text-neutral-500 hover:text-neutral-800 hover:bg-white'}`}>
              {s.title}
            </button>
          ))}
        </div>

        <div className="border-t border-neutral-200 px-4 py-3 flex items-center gap-2 mt-auto">
          <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-medium">AB</div>
          <div>
            <p className="text-xs font-medium text-neutral-800">Anurag</p>
            <p className="text-[10px] text-neutral-400">Intern · Free</p>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ───────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 bg-neutral-50">

        {/* Topbar */}
        <div className="px-5 py-3 border-b border-neutral-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-800">
            <StatusDot active={!loading} />
            {loading ? 'Agent thinking...' : 'Agent ready'}
          </div>
          <div className="flex gap-2">
            {['Web', 'RAG', 'CrewAI'].map(tag => (
              <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full border border-neutral-200 text-neutral-500 bg-neutral-50">{tag}</span>
            ))}
          </div>
        </div>

        {notification && (
          <div className="mx-5 mt-3 px-4 py-2 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700 shrink-0">
            {notification}
          </div>
        )}

        {activeTab === 'chat' && (
          <>
            {isHome ? (
              /* ── HOME SCREEN ── */
              <div className="flex-1 flex flex-col items-center justify-center px-8 pb-8">
                <div className="text-center mb-8">
                  <h1 className="text-4xl font-medium text-neutral-800 mb-2">
                    {getGreeting()}, Bro 👋
                  </h1>
                  <p className="text-neutral-500 text-base">I'm Aria, your AI research buddy 🤖</p>
                </div>

                <div className="w-full max-w-2xl mb-6">
                  <InputBox onSend={handleSend} loading={loading} autoFocus />
                </div>

                <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
                  {quickActions.map(action => (
                    <button key={action.label}
                      onClick={() => {
                        const ta = document.querySelector('textarea')
                        if (ta) { ta.value = action.prompt; ta.focus() }
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-neutral-200
                        bg-white hover:bg-violet-50 hover:border-violet-300 text-sm text-neutral-600
                        hover:text-violet-700 transition-colors">
                      <span>{action.icon}</span>
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* ── CHAT SCREEN ── */
              <>
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
                  {activeSession.messages?.map((msg, i) => (
                    msg.role === 'user'
                      ? <UserBubble key={i} text={msg.text} files={msg.files} />
                      : <AgentBubble key={i} text={msg.text} steps={msg.steps} loading={msg.loading} />
                  ))}
                  <div ref={bottomRef} />
                </div>

                <div className="px-5 py-4 border-t border-neutral-200 bg-white shrink-0">
                  <InputBox onSend={handleSend} loading={loading} />
                </div>
              </>
            )}
          </>
        )}

        {activeTab === 'knowledge' && <KnowledgeBaseTab onNotify={notify} />}
        {activeTab === 'reports'   && <ReportsTab sessions={sessions} />}
        {activeTab === 'settings'  && <SettingsTab />}
      </main>

      {/* ── RIGHT SIDEBAR ─────────────────────────────────── */}
      <aside className="w-44 shrink-0 flex flex-col border-l border-neutral-200 bg-neutral-50">
        <div className="px-3 py-3 border-b border-neutral-200">
          <p className="text-[10px] text-neutral-400 uppercase tracking-wide mb-2">Session Stats</p>
          {[
            { label: 'Searches',      value: stats.searches      },
            { label: 'Chunks stored', value: stats.chunks_stored },
            { label: 'Reports',       value: stats.reports       },
            { label: 'Tokens used',   value: stats.tokens_used   },
          ].map(s => (
            <div key={s.label} className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-neutral-500">{s.label}</span>
              <span className="text-xs font-medium text-neutral-800">{s.value}</span>
            </div>
          ))}
        </div>

        <div className="px-3 py-3 border-b border-neutral-200">
          <p className="text-[10px] text-neutral-400 uppercase tracking-wide mb-2">Active Tools</p>
          {[
            { name: 'Tavily search', active: true  },
            { name: 'ChromaDB',      active: true  },
            { name: 'Groq LLaMA',    active: true  },
            { name: 'PDF reader',    active: false },
            { name: 'LangSmith',     active: false },
          ].map(t => (
            <div key={t.name} className="flex items-center gap-1.5 mb-1.5">
              <StatusDot active={t.active} />
              <span className="text-xs text-neutral-500">{t.name}</span>
            </div>
          ))}
        </div>

        <div className="px-3 py-3">
          <p className="text-[10px] text-neutral-400 uppercase tracking-wide mb-2">Agents</p>
          {[
            { name: 'Researcher', icon: '🔍' },
            { name: 'Analyst',    icon: '📊' },
            { name: 'Writer',     icon: '✍️' },
          ].map(a => (
            <div key={a.name} className="flex items-center gap-1.5 mb-1.5">
              <StatusDot active={true} />
              <span className="text-xs text-neutral-500">{a.icon} {a.name}</span>
            </div>
          ))}
        </div>

        <div className="mt-auto px-3 py-3 border-t border-neutral-200">
          <p className="text-[10px] text-neutral-400 uppercase tracking-wide mb-1">Chats</p>
          <p className="text-xs font-medium text-neutral-700">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</p>
        </div>
      </aside>
    </div>
  )
}