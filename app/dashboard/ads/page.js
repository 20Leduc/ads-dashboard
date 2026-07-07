import Header from '@/components/layout/Header'
import { supabase } from '@/lib/supabase'
import AdsContent from './AdsContent'

export default async function AdsPage() {
  const { data: leads, error } = await supabase.rpc('get_test_leads')

  return (
    <>
      <Header title="Ads Performance" />
      {error ? (
        <div style={{ padding: '24px' }}>
          <p style={{ color: '#ff4444' }}>Erreur de chargement : {error.message}</p>
        </div>
      ) : (
        <AdsContent leads={leads || []} />
      )}
    </>
  )
}
