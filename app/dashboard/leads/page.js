import Header from '@/components/layout/Header'
import { supabase } from '@/lib/supabase'
import LeadsContent from './LeadsContent'

export default async function LeadsPage() {
  const { data: leads, error } = await supabase.rpc('get_test_leads')

  return (
    <>
      <Header title="Leads Tracking" />
      {error ? (
        <div style={{ padding: '32px' }}>
          <p style={{ color: '#ff4444' }}>Erreur de chargement : {error.message}</p>
        </div>
      ) : (
        <LeadsContent leads={leads || []} />
      )}
    </>
  )
}
