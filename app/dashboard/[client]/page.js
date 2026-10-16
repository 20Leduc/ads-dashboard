'use client'
import Header from '@/components/layout/Header'
import { useDashboardData } from '@/lib/DashboardDataContext'
import OverviewContent from './OverviewContent'

export default function DashboardPage() {
  const { leads, spendData, dataLoading } = useDashboardData()

  return (
    <>
      <Header />
      {dataLoading ? (
        <div style={{ padding: '32px', textAlign: 'center' }}>
          <div style={{
            width: '32px', height: '32px',
            border: '3px solid #1f1f1f', borderTop: '3px solid #00D18B',
            borderRadius: '50%', animation: 'spin 1s linear infinite',
            margin: '0 auto 12px'
          }} />
          <p style={{ color: '#888888', fontSize: '14px' }}>Chargement des chiffres...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <OverviewContent leads={leads || []} spendData={spendData || []} />
      )}
    </>
  )
}
