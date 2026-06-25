import { useState } from 'react'

export default function UserBubble({ text, files, messageIndex, onRewrite, loading }) {
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
