export default function ReportsTab({ sessions }) {
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
