'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { getLeadEvents, getDailySpend } from '@/lib/supabase'
import {
  readLastClientSlug,
  resolveDashboardRoute,
  storeLastClientSlug,
  switchClientPath,
} from '@/lib/client-routes'

const DashboardDataContext = createContext(null)

// Le client affiché vient de l'adresse (/dashboard/<slug>/...). Le dataset
// (leads + dépenses) est chargé UNE fois par client et partagé entre toutes
// les pages, sans refetch en naviguant de Leads à Coûts.
export function DashboardDataProvider({ children }) {
  const { user, clients, loading: authLoading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const slug = pathname?.split('/')[2] || undefined

  const route = useMemo(() => {
    if (authLoading || !user) return null
    return resolveDashboardRoute({ clients, slug, pathname, lastSlug: readLastClientSlug() })
  }, [authLoading, user, clients, slug, pathname])

  const clientSchema = route?.type === 'ok' ? route.client : null
  const userId = user?.id
  const schemaName = clientSchema?.schema_name ?? null
  const [loaded, setLoaded] = useState({ schemaName: null, leads: [], spendData: [], error: null })

  useEffect(() => {
    if (clientSchema) storeLastClientSlug(clientSchema.slug)
  }, [clientSchema])

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

  const selectClient = useCallback(
    (toSlug) => {
      if (clientSchema) router.push(switchClientPath(pathname, clientSchema.slug, toSlug))
    },
    [clientSchema, pathname, router]
  )

  // Les données ne sont exposées que si elles appartiennent au client
  // affiché : rien de l'ancien client ne s'affiche pendant un changement.
  const isCurrent = schemaName !== null && loaded.schemaName === schemaName

  return (
    <DashboardDataContext.Provider
      value={{
        user,
        clients,
        clientSchema,
        route,
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
