export default function DashboardLoading() {
  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div className="animate-pulse" style={{ height: '32px', width: '200px', background: '#1f1f1f', borderRadius: '8px' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
        {[1, 2].map((i) => (
          <div key={i} className="animate-pulse" style={{ background: '#111111', border: '1px solid #1f1f1f', borderRadius: '12px', padding: '24px', height: '120px' }} />
        ))}
      </div>
      <div className="animate-pulse" style={{ background: '#111111', border: '1px solid #1f1f1f', borderRadius: '12px', padding: '24px', height: '360px' }} />
    </div>
  )
}
