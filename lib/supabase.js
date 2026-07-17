import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'aicliently-auth',
  }
})

export async function getLeadEvents(schema = 'client_robin_worms') {
  let allData = []
  let page = 0
  const pageSize = 1000

  while (true) {
    const { data, error } = await supabase
      .rpc('get_lead_events', { schema_name: schema })
      .range(page * pageSize, (page + 1) * pageSize - 1)

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
    const { data, error } = await supabase
      .rpc('get_daily_spend', { schema_name: schema })
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (error) throw error
    if (!data || data.length === 0) break

    allData = [...allData, ...data]

    if (data.length < pageSize) break
    page++
  }

  return allData
}
