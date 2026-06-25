import { navItems } from '../constants.js'

export default function Sidebar({
  activeTab, setActiveTab,
  activeId, setActiveId,
  searchQuery, setSearchQuery,
  filteredSessions,
  activeMenuId, setActiveMenuId,
  onNewChat, onClearAll,
  onPinSession, onRenameSession, onDeleteSession,
}) {
  return (
    <aside style={{
      width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column',
      borderRight: '1px solid #e5e5e5', background: '#fafafa', height: '100vh', overflow: 'hidden',
    }}>
      <div style={{ padding: '16px', borderBottom: '1px solid #e5e5e5', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>A</div>
        <div>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111', margin: 0 }}>Aria</p>
          <p style={{ fontSize: 10, color: '#a3a3a3', margin: 0 }}>Groq · CrewAI · RAG</p>
        </div>
      </div>

      <div style={{ padding: '12px 14px 6px' }}>
        <button onClick={onNewChat} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '12px', borderRadius: 12, border: '1px solid #c4b5fd', background: '#fff',
          color: '#7c3aed', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
          boxShadow: '0 1px 3px rgba(124,58,237,0.05)',
        }}>
          ✏️ New chat
        </button>
      </div>

      <nav style={{ padding: '6px 0' }}>
        {navItems.map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 20px', background: activeTab === item.id ? '#fff' : 'transparent',
              color: activeTab === item.id ? '#7c3aed' : '#525252', fontSize: '0.9rem',
              fontWeight: activeTab === item.id ? 600 : 400, border: 'none',
              borderRight: activeTab === item.id ? '3px solid #7c3aed' : '3px solid transparent',
              cursor: 'pointer', textAlign: 'left',
            }}>
            <span style={{ fontSize: '1.05rem' }}>{item.icon}</span>{item.label}
          </button>
        ))}
      </nav>

      <div style={{ padding: '4px 14px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #e5e5e5', borderRadius: '8px', padding: '4px 10px', width: '100%' }}>
          <span style={{ fontSize: '0.85rem', color: '#a3a3a3', marginRight: '6px', userSelect: 'none' }}>🔍</span>
          <input
            type="text" placeholder="Search history..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: '0.8rem', background: 'transparent', color: '#262626', width: '100%' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', color: '#a3a3a3', cursor: 'pointer', fontSize: '0.75rem', padding: '2px 4px', fontWeight: 'bold' }}>
              ✕
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: '6px 20px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: 10, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Recent Chats</p>
        <button onClick={onClearAll}
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
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '2px 8px 2px 20px',
                  background: s.id === activeId && activeTab === 'chat' ? '#f3f0ff' : 'transparent',
                  position: 'relative', borderRadius: '8px', margin: '2px 8px',
                }}
              >
                <button
                  onClick={() => { setActiveId(s.id); setActiveTab('chat') }}
                  style={{
                    flex: 1, textAlign: 'left', fontSize: '0.8rem',
                    color: s.id === activeId && activeTab === 'chat' ? '#7c3aed' : '#6b7280',
                    border: 'none', fontWeight: s.id === activeId && activeTab === 'chat' ? 600 : 400,
                    background: 'transparent', cursor: 'pointer',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '6px 0',
                  }}>
                  {s.isPinned ? '📌 ' : '📁 '} {s.title}
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); setActiveMenuId(isMenuOpen ? null : s.id) }}
                  style={{ background: 'none', border: 'none', color: '#a3a3a3', cursor: 'pointer', fontSize: '1rem', padding: '4px 8px', fontWeight: 'bold' }}>
                  ⋮
                </button>

                {isMenuOpen && (
                  <div style={{
                    position: 'absolute', top: '28px', right: '10px', background: '#fff',
                    border: '1px solid #e5e5e5', borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 100,
                    display: 'flex', flexDirection: 'column', padding: '4px', minWidth: '110px',
                  }}>
                    <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); onPinSession(s.id) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', fontSize: '0.75rem', color: '#404040', background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', borderRadius: '4px' }}>
                      📌 {s.isPinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); onRenameSession(s.id) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', fontSize: '0.75rem', color: '#404040', background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', borderRadius: '4px' }}>
                      ✏️ Rename
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); onDeleteSession(s.id) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', fontSize: '0.75rem', color: '#ef4444', background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', borderRadius: '4px' }}>
                      🗑️ Delete
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
  )
}
