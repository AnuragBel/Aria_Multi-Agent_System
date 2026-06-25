import { useState } from 'react'

export default function SettingsTab() {
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
