// Leave this empty in development so Vite proxies API requests to FastAPI.
// Set VITE_API_URL for a separately hosted backend.
export const API = import.meta.env.VITE_API_URL || ''

export const quickActions = [
  { id: 'DeepResearch', label: 'Deep Research', icon: '🔬', textToInsert: 'Deep Research: ' },
  { id: 'Summarize',    label: 'Summarize',     icon: '📝', textToInsert: 'Summarize: ' },
  { id: 'Explain',      label: 'Explain',       icon: '💡', textToInsert: 'Explain: ' },
  { id: 'Compare',      label: 'Compare',       icon: '⚖️',  textToInsert: 'Compare: ' },
  { id: 'Analyze',      label: 'Analyze',       icon: '📊', textToInsert: 'Analyze: ' },
]

export const navItems = [
  { id: 'chat',      label: 'Chat',           icon: '💬' },
  { id: 'knowledge', label: 'Knowledge Base',  icon: '🗄️' },
  { id: 'reports',   label: 'Reports',         icon: '📄' },
  { id: 'settings',  label: 'Settings',        icon: '⚙️' },
]
