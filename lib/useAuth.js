'use client'
import { useState, useEffect } from 'react'
import { supabase, withAuthRetry } from '@/lib/supabase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [clientSchema, setClientSchema] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setLoading(false)
        return
      }

      setUser(session.user)

      const { data } = await withAuthRetry(() =>
        supabase.rpc('get_client_by_user_id', { user_uuid: session.user.id })
      )

      const clientData = (data && data.length > 0) ? data[0] : {
        schema_name: 'client_robin_worms',
        name: 'Robin Worms',
        slug: 'robin-worms'
      }
      setClientSchema(clientData)
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!session) {
          setUser(null)
          setClientSchema(null)
          setLoading(false)
          return
        }
        setUser(session.user)

        const { data } = await withAuthRetry(() =>
          supabase.rpc('get_client_by_user_id', { user_uuid: session.user.id })
        )

        const clientData = (data && data.length > 0) ? data[0] : {
          schema_name: 'client_robin_worms',
          name: 'Robin Worms',
          slug: 'robin-worms'
        }
        setClientSchema(clientData)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, clientSchema, loading }
}