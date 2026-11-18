'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { getDashboardData } from '@/lib/supabase'
import {
  isStale,
  REFRESH_CHECK_EVERY_MS,
  REFRESH_INTERVAL_MS,
  REFRESH_ON_RETURN_AFTER_MS,
} from '@/lib/refresh'
import {
  readLastClientSlug,
  resolveDashboardRoute,
  storeLastClientSlug,
  switchClientPath,
} from '@/lib/client-routes'

const DashboardDataContext = createContext(null)

// Le client affiché vient de l'adresse (/dashboard/<slug>/...). Le dataset
// (leads + dépenses) est chargé par client et partagé entre toutes les pages,
// sans refetch en naviguant de Leads à Coûts. Il est rechargé en arrière-plan
// (voir lib/refresh.js) : les chiffres affichés restent en place pendant ce temps.
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
  const [reloadTick, setReloadTick] = useState(0)
  const requestedAtRef = useRef(null)

  useEffect(() => {
    if (clientSchema) storeLastClientSlug(clientSchema.slug)
  }, [clientSchema])

  useEffect(() => {
    if (authLoading || !userId || !schemaName) return
    let cancelled = false
    requestedAtRef.current = Date.now()
    getDashboardData(schemaName)
      .then(({ leads, spendData }) => {
        if (!cancelled) setLoaded({ schemaName, leads, spendData, error: null })
      })
      .catch((error) => {
        console.error(error)
        // Un rechargement en arrière-plan qui échoue garde les chiffres déjà affichés.
        if (!cancelled) {
          setLoaded((prev) => (prev.schemaName === schemaName
            ? prev
            : { schemaName, leads: [], spendData: [], error }))
        }
      })
    return () => {
      cancelled = true
    }
  }, [authLoading, userId, schemaName, reloadTick])

  // Rechargement automatique : toutes les 10 min onglet affiché, et au retour
  // sur l'onglet après plus de 2 min. Rien ne part tant que l'onglet est caché.
  useEffect(() => {
    if (!schemaName) return
    const refreshIfStale = (maxAgeMs) => {
      if (document.visibilityState !== 'visible') return
      if (isStale(requestedAtRef.current, Date.now(), maxAgeMs)) setReloadTick((tick) => tick + 1)
    }
    const onVisibilityChange = () => refreshIfStale(REFRESH_ON_RETURN_AFTER_MS)
    const timer = setInterval(() => refreshIfStale(REFRESH_INTERVAL_MS), REFRESH_CHECK_EVERY_MS)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [schemaName])

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
