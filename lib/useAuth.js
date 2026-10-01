'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase, withAuthRetry } from '@/lib/supabase'

const SELECTED_CLIENT_KEY = 'aicliently:selected-client'

function readStoredClient() {
  try {
    return localStorage.getItem(SELECTED_CLIENT_KEY)
  } catch {
    return null
  }
}

function storeClient(schemaName) {
  try {
    localStorage.setItem(SELECTED_CLIENT_KEY, schemaName)
  } catch {
    // Stockage indisponible (navigation privée) : le choix ne sera pas mémorisé.
  }
}

async function fetchClients(userId) {
  const { data } = await withAuthRetry(() =>
    supabase.rpc('get_client_by_user_id', { user_uuid: userId })
  )
  return Array.isArray(data) ? data : []
}

export function useAuth() {
  const [user, setUser] = useState(null)
  const [clients, setClients] = useState([])
  const [selectedSchema, setSelectedSchema] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Aucun client par défaut : un compte non rattaché ne doit jamais
    // retomber sur les données d'un autre client.
    const load = async (session) => {
      if (!session) {
        setUser(null)
        setClients([])
        setSelectedSchema(null)
        setLoading(false)
        return
      }
      setUser(session.user)
      const list = await fetchClients(session.user.id)
      const stored = readStoredClient()
      setClients(list)
      setSelectedSchema(
        list.some((c) => c.schema_name === stored) ? stored : list[0]?.schema_name ?? null
      )
      setLoading(false)
    }

    supabase.auth.getSession().then(({ data: { session } }) => load(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      load(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  const selectClient = useCallback((schemaName) => {
    storeClient(schemaName)
    setSelectedSchema(schemaName)
  }, [])

  const clientSchema = clients.find((c) => c.schema_name === selectedSchema) || null

  return { user, clients, clientSchema, selectClient, loading }
}
