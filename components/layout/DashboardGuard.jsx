'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useDashboardData } from '@/lib/DashboardDataContext'
import { supabase } from '@/lib/supabase'
import { clientPath } from '@/lib/client-routes'

const screenStyle = {
  minHeight: '100vh',
  background: '#0a0a0a',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column',
  gap: '16px',
  padding: '16px',
  textAlign: 'center',
}

const actionStyle = {
  background: 'transparent',
  border: '1px solid #1f1f1f',
  color: '#888888',
  padding: '8px 16px',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '13px',
  textDecoration: 'none',
}

function Spinner() {
  return (
    <div style={screenStyle}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid #1f1f1f',
        borderTop: '3px solid #00D18B',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <p style={{ color: '#888888', fontSize: '14px' }}>Chargement...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function Notice({ title, children }) {
  return (
    <div style={screenStyle}>
      <p style={{ color: '#ffffff', fontSize: '16px', fontWeight: 600, margin: 0 }}>{title}</p>
      {children}
    </div>
  )
}

export default function DashboardGuard({ children }) {
  const { user, route, authLoading: loading } = useDashboardData()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.push('/login')
    else if (route?.type === 'redirect') router.replace(route.to)
  }, [user, loading, route, router])

  if (loading || route?.type === 'redirect') return <Spinner />
  if (!user) return null

  if (route?.type === 'no-clients') {
    return (
      <Notice title="Aucun espace client n'est associé à ce compte.">
        <p style={{ color: '#888888', fontSize: '14px', margin: 0 }}>
          Contactez votre administrateur pour obtenir l&apos;accès.
        </p>
        <button
          style={actionStyle}
          onClick={async () => {
            await supabase.auth.signOut()
            router.push('/login')
          }}
        >
          Se déconnecter
        </button>
      </Notice>
    )
  }

  if (route?.type === 'forbidden') {
    return (
      <Notice title="Vous n'avez pas accès à cet espace client.">
        <Link href={clientPath(route.fallback.slug)} style={actionStyle}>
          Aller à {route.fallback.name}
        </Link>
      </Notice>
    )
  }

  return children
}
