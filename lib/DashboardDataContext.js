'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from '@/lib/useAuth'
import { getLeadEvents, getDailySpend } from '@/lib/supabase'

const DashboardDataContext = createContext(null)

// Fetch le dataset complet (leads + dépenses) UNE SEULE fois par client
// sélectionné, et le partage entre toutes les pages du dashboard — évite que
// chaque page (Leads, Setting, Closing, Ads, Coûts) refasse le même fetch.
export function DashboardDataProvider({ children }) {
  const { user, clients, clientSchema, selectClient, loading: authLoading } = useAuth()
  const userId = user?.id
  const schemaName = clientSchema?.schema_name ?? null
  const [loaded, setLoaded] = useState({ schemaName: null, leads: [], spendData: [], error: null })

  useEffect(() => {
    if (authLoading || !userId || !schemaName) return
    let cancelled = false
    Promise.all([getLeadEvents(schemaName), getDailySpend(schemaName)])
      .then(([leads, spendData]) => {
        if (!cancelled) setLoaded({ schemaName, leads, spendData, error: null })
      })
      .catch((error) => {
        console.error(error)
        if (!cancelled) setLoaded({ schemaName, leads: [], spendData: [], error })
      })
    return () => {
      cancelled = true
    }
  }, [authLoading, userId, schemaName])

  // Les données ne sont exposées que si elles appartiennent au client
  // sélectionné : rien de l'ancien client ne s'affiche pendant un changement.
  const isCurrent = schemaName !== null && loaded.schemaName === schemaName

  return (
    <DashboardDataContext.Provider
      value={{
        user,
        clients,
        clientSchema,
        selectClient,
        authLoading,
        leads: isCurrent ? loaded.leads : [],
        spendData: isCurrent ? loaded.spendData : [],
        error: isCurrent ? loaded.error : null,
        dataLoading: authLoading || (schemaName !== null && !isCurrent),
      }}
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
