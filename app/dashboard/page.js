import Header from '@/components/layout/Header'

export default function DashboardPage() {
  return (
    <>
      <Header title="Dashboard" />
      <div style={{ padding: '32px' }}>
        <p style={{ color: '#888888' }}>Bienvenue sur votre dashboard.</p>

        <div style={{
          background: '#111111',
          border: '1px solid #1f1f1f',
          borderRadius: '12px',
          padding: '24px',
          marginTop: '24px'
        }}>
          <p style={{ color: '#ffffff', fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>
            Guide d'utilisation du dashboard
          </p>
          <p style={{ color: '#888888', fontSize: '14px', marginBottom: '20px' }}>
            Découvrez comment naviguer et interpréter vos données
          </p>
          <iframe
            width="100%"
            height="500"
            src="https://www.youtube.com/embed/LcF6ut-1M94"
            style={{ borderRadius: '8px', border: 'none' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </>
  )
}