import DashboardGuard from '@/components/layout/DashboardGuard'
import DashboardShell from '@/components/layout/DashboardShell'
import { DashboardDataProvider } from '@/lib/DashboardDataContext'

export default function DashboardLayout({ children }) {
  return (
    <DashboardDataProvider>
      <DashboardGuard>
        <DashboardShell>{children}</DashboardShell>
      </DashboardGuard>
    </DashboardDataProvider>
  )
}
