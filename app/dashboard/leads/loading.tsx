export default function LeadsLoading() {
  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="animate-pulse" style={{ height: '28px', width: '180px', background: '#1f1f1f', borderRadius: '8px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
        {[1, 2].map((i) => (
          <div key={i} className="animate-pulse" style={{ background: '#111111', border: '1px solid #1f1f1f', borderRadius: '12px', padding: '24px', height: '120px' }} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '65fr 35fr', gap: '16px' }}>
        <div className="animate-pulse" style={{ background: '#111111', border: '1px solid #1f1f1f', borderRadius: '12px', padding: '24px', height: '360px' }} />
        <div className="animate-pulse" style={{ background: '#111111', border: '1px solid #1f1f1f', borderRadius: '12px', padding: '24px', height: '360px' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse" style={{ background: '#111111', border: '1px solid #1f1f1f', borderRadius: '12px', padding: '24px', height: '300px' }} />
        ))}
      </div>
    </div>
  )
}
