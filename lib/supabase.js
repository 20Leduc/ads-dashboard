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

// Tout le dataset d'un client (événements leads + dépenses) en un seul appel.
// Une seule valeur JSON : pas de pagination, donc la base ne recalcule pas
// tout l'historique pour chaque page de 1000 lignes.
export async function getDashboardData(schema) {
  if (!schema || typeof schema !== 'string') {
    throw new Error('A tenant schema is required to load dashboard data')
  }

  const { data, error } = await withAuthRetry(() =>
    supabase.rpc('get_dashboard_data', { schema_name: schema })
  )

  if (error) throw error
  return { leads: data?.events ?? [], spendData: data?.spend ?? [] }
}
