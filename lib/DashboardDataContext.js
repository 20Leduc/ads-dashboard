'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from '@/lib/useAuth'
import { getLeadEvents, getDailySpend } from '@/lib/supabase'

const DashboardDataContext = createContext(null)

// Fetch le dataset complet (leads + dépenses) UNE SEULE fois par session, et le
// partage entre toutes les pages du dashboard — évite que chaque page (Leads,
// Setting, Closing, Ads, Coûts) refasse le même fetch coûteux à chaque navigation.
export function DashboardDataProvider({ children }) {
  const { user, clientSchema, loading: authLoading } = useAuth()
  const [leads, setLeads] = useState([])
  const [spendData, setSpendData] = useState([])
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (authLoading) return
    if (!user || !clientSchema) {
      setDataLoading(false)
      return
    }

    let cancelled = false
    const fetchAll = async () => {
      try {
        const [leadsData, spend] = await Promise.all([
          getLeadEvents(clientSchema.schema_name),
          getDailySpend(clientSchema.schema_name),
        ])
        if (cancelled) return
        setLeads(leadsData)
        setSpendData(spend)
      } catch (err) {
        if (!cancelled) {
          console.error(err)
          setError(err)
        }
      } finally {
        if (!cancelled) setDataLoading(false)
      }
    }

    fetchAll()
    return () => {
      cancelled = true
    }
  }, [user, clientSchema, authLoading])

  return (
    <DashboardDataContext.Provider
      value={{ user, clientSchema, authLoading, leads, spendData, dataLoading, error }}
    >
      {children}
    </DashboardDataContext.Provider>
  )
}

export function useDashboardData() {
  const ctx = useContext(DashboardDataContext)
  if (!ctx) {
    throw new Error('useDashboardData must be used within a DashboardDataProvider')
  }
  return ctx
}
