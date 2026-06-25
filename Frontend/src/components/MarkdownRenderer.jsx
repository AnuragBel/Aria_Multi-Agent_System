import React from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

class MarkdownErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError) {
      return (
        <p style={{ fontSize: '0.875rem', color: '#262626', whiteSpace: 'pre-wrap' }}>
          {this.props.fallbackText}
        </p>
      )
    }
    return this.props.children
  }
}

const MD = {
  h1: ({ children }) => <h1 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#111', margin: '4px 0 8px' }}>{children}</h1>,
  h2: ({ children }) => <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#111', margin: '12px 0 6px' }}>{children}</h2>,
  h3: ({ children }) => <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#111', margin: '8px 0 4px' }}>{children}</h3>,
  p:  ({ children }) => <p  style={{ fontSize: '0.875rem', color: '#262626', lineHeight: 1.7, margin: '0 0 8px' }}>{children}</p>,
  ul: ({ children }) => <ul style={{ fontSize: '0.875rem', color: '#262626', paddingLeft: '18px', margin: '0 0 8px', listStyleType: 'disc' }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ fontSize: '0.875rem', color: '#262626', paddingLeft: '18px', margin: '0 0 8px', listStyleType: 'decimal' }}>{children}</ol>,
  li: ({ children }) => <li style={{ fontSize: '0.875rem', color: '#404040', marginBottom: '3px', lineHeight: 1.6 }}>{children}</li>,
  strong: ({ children }) => <strong style={{ fontWeight: 600, color: '#111' }}>{children}</strong>,
  em: ({ children }) => <em style={{ fontStyle: 'italic' }}>{children}</em>,
  hr: () => <hr style={{ border: 'none', borderTop: '1px solid #e5e5e5', margin: '12px 0' }} />,
  a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#7c3aed', textDecoration: 'underline' }}>{children}</a>,
  blockquote: ({ children }) => <blockquote style={{ borderLeft: '3px solid #c4b5fd', paddingLeft: '12px', color: '#737373', fontStyle: 'italic', margin: '8px 0' }}>{children}</blockquote>,
  code: ({ inline, className, children }) => {
    const lang = /language-(\w+)/.exec(className || '')?.[1]
    if (!inline && lang) return (
      <div style={{ margin: '8px 0', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e5e5' }}>
        <div style={{ background: '#f5f5f5', padding: '4px 12px', fontSize: '11px', color: '#888', fontFamily: 'monospace', borderBottom: '1px solid #e5e5e5' }}>{lang}</div>
        <pre style={{ background: '#1a1a2e', color: '#e2e8f0', padding: '12px', margin: 0, overflowX: 'auto', fontSize: '0.8rem', fontFamily: 'monospace', lineHeight: 1.6 }}><code>{String(children).replace(/\n$/, '')}</code></pre>
      </div>
    )
    return <code style={{ background: '#f3f0ff', color: '#6d28d9', padding: '1px 5px', borderRadius: '4px', fontSize: '0.8rem', fontFamily: 'monospace' }}>{children}</code>
  },
  table: ({ children }) => <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', margin: '8px 0' }}>{children}</table>,
  th: ({ children }) => <th style={{ background: '#f5f5f5', border: '1px solid #e5e5e5', padding: '6px 10px', textAlign: 'left', fontWeight: 600 }}>{children}</th>,
  td: ({ children }) => <td style={{ border: '1px solid #e5e5e5', padding: '6px 10px' }}>{children}</td>,
}

export default function SafeMarkdown({ text }) {
  return (
    <MarkdownErrorBoundary fallbackText={text}>
      <Markdown remarkPlugins={[remarkGfm]} components={MD}>{text || ''}</Markdown>
    </MarkdownErrorBoundary>
  )
}
