export default function StatusDot({ active }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: active ? '#22c55e' : '#d4d4d4',
        marginRight: 6,
        flexShrink: 0,
      }}
    />
  )
}
