'use client'
import { useState, useEffect } from 'react'
import { supabase, withAuthRetry } from '@/lib/supabase'

async function fetchClients(userId) {
  // Rattache le compte aux clients pour lesquels une invitation valide existe
  // pour son email (liens /invite). Sans invitation, ou si la fonction n'existe
  // pas encore en base, rien ne change.
  await withAuthRetry(() => supabase.rpc('claim_client_invites'))
  const { data } = await withAuthRetry(() =>
    supabase.rpc('get_client_by_user_id', { user_uuid: userId })
  )
  return Array.isArray(data) ? data : []
}

// Compte connecté et clients auxquels il est rattaché. Le client affiché est
// choisi par l'adresse (/dashboard/<slug>), pas ici.
export function useAuth() {
  const [user, setUser] = useState(null)
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async (session) => {
      if (!session) {
        setUser(null)
        setClients([])
        setLoading(false)
        return
      }
      setUser(session.user)
      setClients(await fetchClients(session.user.id))
      setLoading(false)
    }

    supabase.auth.getSession().then(({ data: { session } }) => load(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      load(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  return { user, clients, loading }
}
