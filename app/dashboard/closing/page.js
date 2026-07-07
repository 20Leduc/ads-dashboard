import Header from '@/components/layout/Header'
import { supabase } from '@/lib/supabase'
import ClosingContent from './ClosingContent'

export default async function ClosingPage() {
  const { data: leads, error } = await supabase.rpc('get_test_leads')

  return (
    <>
      <Header title="Closing Tracking" />
      {error ? (
        <div style={{ padding: '32px' }}>
          <p style={{ color: '#ff4444' }}>Erreur de chargement : {error.message}</p>
        </div>
      ) : (
        <ClosingContent leads={leads || []} />
      )}
    </>
  )
}
