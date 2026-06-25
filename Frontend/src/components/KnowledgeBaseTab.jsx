import { useState, useRef } from 'react'
import { API } from '../constants.js'

export default function KnowledgeBaseTab({ onNotify }) {
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
