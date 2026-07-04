'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: 'http://localhost:3000/dashboard'
      }
    })
    if (!error) setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1>Vérifiez votre email</h1>
        <p>Un lien de connexion a été envoyé à {email}</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '40px', maxWidth: '400px', margin: '0 auto' }}>
      <h1>Connexion</h1>
      <input
        type="email"
        placeholder="votre@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
      />
      <button
        onClick={handleLogin}
        disabled={loading}
        style={{ width: '100%', padding: '10px', cursor: 'pointer' }}
      >
        {loading ? 'Envoi...' : 'Recevoir le lien de connexion'}
      </button>
    </div>
  )
}