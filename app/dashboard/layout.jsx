import Sidebar from '@/components/layout/Sidebar'
import DashboardGuard from '@/components/layout/DashboardGuard'
import { DashboardDataProvider } from '@/lib/DashboardDataContext'

export default function DashboardLayout({ children }) {
  return (
    <DashboardDataProvider>
      <DashboardGuard>
        <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0a' }}>
          <Sidebar />
          <main style={{
            marginLeft: '240px',
            flex: 1,
            width: 'calc(100% - 240px)',
            overflowX: 'hidden'
          }}>
            {children}
          </main>
        </div>
      </DashboardGuard>
    </DashboardDataProvider>
  )
}
