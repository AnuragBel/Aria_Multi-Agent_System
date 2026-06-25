export default function StepList({ steps }) {
  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f5f5f5' }}>
      {steps.map((step, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 4 }}>
          <span style={{ color: '#22c55e', fontSize: 11, marginTop: 1, flexShrink: 0 }}>✓</span>
          <span style={{ fontSize: 11, color: '#737373', lineHeight: 1.5 }}>{step}</span>
        </div>
      ))}
    </div>
  )
}
