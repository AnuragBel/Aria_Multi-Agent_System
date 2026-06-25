import { useState } from 'react'
import SafeMarkdown from './MarkdownRenderer.jsx'
import StepList from './StepList.jsx'

export default function AgentBubble({ text, steps, loading }) {
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
          </>
        )}
      </div>
    </div>
  )
}
