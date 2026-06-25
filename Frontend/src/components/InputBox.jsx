import { useState, useEffect, useRef } from 'react'

export default function InputBox({ onSend, onStop, loading, autoFocus, fileInputRef, attachments, onFileAttach, onRemoveAttach, inputValue, setInputValue }) {
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
