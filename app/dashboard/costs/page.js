'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { getLeadEvents, getDailySpend } from '@/lib/supabase'
import CostsContent from './CostsContent'

export default function CostsPage() {
  const { user, clientSchema, loading: authLoading } = useAuth()
  const [spendData, setSpendData] = useState([])
  const [leadsData, setLeadsData] = useState([])
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
        const [spend, leads] = await Promise.all([
          getDailySpend(clientSchema.schema_name),
          getLeadEvents(clientSchema.schema_name),
        ])
        setSpendData(spend)
        setLeadsData(leads)
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
        <p style={{ color: '#888888', fontSize: '14px' }}>Chargement des coûts...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return <CostsContent spendData={spendData || []} leadsData={leadsData || []} />
}
