'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDashboardData } from '@/lib/DashboardDataContext'
import { supabase } from '@/lib/supabase'

export default function DashboardGuard({ children }) {
  const { user, clientSchema, authLoading: loading } = useDashboardData()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px'
      }}>
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

  if (!user) return null

  if (!clientSchema) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px',
        padding: '16px',
        textAlign: 'center',
      }}>
        <p style={{ color: '#ffffff', fontSize: '16px', fontWeight: 600, margin: 0 }}>
          Aucun espace client n&apos;est associé à ce compte.
        </p>
        <p style={{ color: '#888888', fontSize: '14px', margin: 0 }}>
          Contactez votre administrateur pour obtenir l&apos;accès.
        </p>
        <button
          onClick={async () => {
            await supabase.auth.signOut()
            router.push('/login')
          }}
          style={{
            background: 'transparent',
            border: '1px solid #1f1f1f',
            color: '#888888',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          Se déconnecter
        </button>
      </div>
    )
  }

  return children
}
