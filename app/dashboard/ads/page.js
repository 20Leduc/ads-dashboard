'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { getLeadEvents } from '@/lib/supabase'
import AdsContent from './AdsContent'

export default function AdsPage() {
  const { user, clientSchema, loading: authLoading } = useAuth()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/login')
      return
    }
    if (!clientSchema) return

    const fetchData = async () => {
      try {
        const leads = await getLeadEvents(clientSchema.schema_name)
        setData(leads)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, clientSchema, authLoading, router])

  if (authLoading || loading) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <div style={{
          width: '32px', height: '32px',
          border: '3px solid #1f1f1f', borderTop: '3px solid #00D18B',
          borderRadius: '50%', animation: 'spin 1s linear infinite',
          margin: '0 auto 12px'
        }} />
        <p style={{ color: '#888888', fontSize: '14px' }}>Chargement des ads...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return <AdsContent leads={data || []} />
}
