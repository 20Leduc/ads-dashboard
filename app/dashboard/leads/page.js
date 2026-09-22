'use client'
import { useDashboardData } from '@/lib/DashboardDataContext'
import LeadsContent from './LeadsContent'

export default function LeadsPage() {
  const { leads, dataLoading } = useDashboardData()

  if (dataLoading) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <div style={{
          width: '32px', height: '32px',
          border: '3px solid #1f1f1f', borderTop: '3px solid #00D18B',
          borderRadius: '50%', animation: 'spin 1s linear infinite',
          margin: '0 auto 12px'
        }} />
        <p style={{ color: '#888888', fontSize: '14px' }}>Chargement des leads...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return <LeadsContent leads={leads || []} />
}
