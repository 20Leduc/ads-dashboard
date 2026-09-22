import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
})

function isAuthError(error) {
  if (!error) return false
  if (error.code === 'PGRST303') return true
  if (error.status === 401) return true
  return /jwt/i.test(error.message || '')
}

// Un onglet resté ouvert plus longtemps que la durée de vie du JWT (ou en
// arrière-plan trop longtemps) peut manquer le rafraîchissement automatique
// de supabase-js. Plutôt que de laisser toutes les pages afficher des 0
// silencieusement, on retente une fois après un refresh explicite de la
// session, et on déconnecte/redirige vers /login si le refresh token
// lui-même n'est plus valide.
export async function withAuthRetry(fn) {
  const first = await fn()
  if (!isAuthError(first.error)) return first

  const { error: refreshError } = await supabase.auth.refreshSession()
  if (refreshError) {
    await supabase.auth.signOut()
    if (typeof window !== 'undefined') window.location.href = '/login'
    return first
  }

  return fn()
}

export async function getLeadEvents(schema) {
  if (!schema || typeof schema !== 'string') {
    throw new Error('A tenant schema is required to load lead events')
  }

  let allData = []
  let page = 0
  const pageSize = 1000

  while (true) {
    const { data, error } = await withAuthRetry(() =>
      supabase
        .rpc('get_lead_events', { schema_name: schema })
        .range(page * pageSize, (page + 1) * pageSize - 1)
    )

    if (error) throw error
    if (!data || data.length === 0) break

    allData = [...allData, ...data]

    if (data.length < pageSize) break
    page++
  }

  return allData
}

export async function getDailySpend(schema = 'client_robin_worms') {
  let allData = []
  let page = 0
  const pageSize = 1000

  while (true) {
    const { data, error } = await withAuthRetry(() =>
      supabase
        .rpc('get_daily_spend', { schema_name: schema })
        .range(page * pageSize, (page + 1) * pageSize - 1)
    )

    if (error) throw error
    if (!data || data.length === 0) break

    allData = [...allData, ...data]

    if (data.length < pageSize) break
    page++
  }

  return allData
}
