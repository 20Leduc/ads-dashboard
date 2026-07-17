'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body style={{ background: '#0a0a0a', color: '#ffffff', fontFamily: 'sans-serif', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Une erreur est survenue</h2>
          <p style={{ color: '#888888', marginBottom: '24px' }}>{error.message}</p>
          <button
            onClick={() => reset()}
            style={{ background: '#00D18B', color: '#000000', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  )
}
