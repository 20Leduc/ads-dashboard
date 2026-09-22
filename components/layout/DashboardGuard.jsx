'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDashboardData } from '@/lib/DashboardDataContext'

export default function DashboardGuard({ children }) {
  const { user, authLoading: loading } = useDashboardData()
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

  return children
}
