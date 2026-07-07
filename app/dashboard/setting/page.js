import Header from '@/components/layout/Header'
import { supabase } from '@/lib/supabase'
import SettingContent from './SettingContent'

export default async function SettingPage() {
  const { data: leads, error } = await supabase.rpc('get_test_leads')

  return (
    <>
      <Header title="Setting Tracking" />
      {error ? (
        <div style={{ padding: '32px' }}>
          <p style={{ color: '#ff4444' }}>Erreur de chargement : {error.message}</p>
        </div>
      ) : (
        <SettingContent leads={leads || []} />
      )}
    </>
  )
}
