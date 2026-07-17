'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

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

      const { data } = await supabase
        .rpc('get_client_by_user_id', { user_uuid: session.user.id })

      setClientSchema(data?.[0] || null)
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

        const { data } = await supabase
          .rpc('get_client_by_user_id', { user_uuid: session.user.id })

        setClientSchema(data?.[0] || null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, clientSchema, loading }
}
