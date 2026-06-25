export function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Good night'
}

export function createSession(title = 'New chat') {
  return { id: Date.now(), title, messages: [], isPinned: false }
}
