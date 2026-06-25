import StatusDot from './StatusDot.jsx'

const toolItems = [
  { name: 'Tavily search', active: true },
  { name: 'ChromaDB', active: true },
  { name: 'Groq LLaMA', active: true },
  { name: 'PDF reader', active: false },
]

const agentItems = [
  { name: 'Researcher', icon: '🔍' },
  { name: 'Writer', icon: '✍️' },
]

export default function RightSidebar({ stats, sessions }) {
  return (
    <aside style={{
      width: 176, flexShrink: 0, display: 'flex', flexDirection: 'column',
      borderLeft: '1px solid #e5e5e5', background: '#fafafa',
    }}>
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
        {toolItems.map(t => (
          <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <StatusDot active={t.active} />
            <span style={{ fontSize: '0.75rem', color: '#737373', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
          </div>
        ))}
      </div>

      <div style={{ padding: '12px' }}>
        <p style={{ fontSize: 10, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>System Agents</p>
        {agentItems.map(a => (
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
  )
}
