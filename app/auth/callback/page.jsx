'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleAuth = async () => {
      const url = new URL(window.location.href)
      const token_hash = url.searchParams.get('token_hash')
      const type = url.searchParams.get('type')
      const code = url.searchParams.get('code')

      try {
        if (token_hash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type,
          })
          if (error) {
            console.error('verifyOtp error:', error)
            router.push('/login?error=invalid_token')
            return
          }
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            console.error('exchangeCode error:', error)
            router.push('/login?error=invalid_code')
            return
          }
        }

        const { data: { session } } = await supabase.auth.getSession()

        if (session) {
          router.push('/dashboard')
        } else {
          router.push('/login?error=no_session')
        }
      } catch (err) {
        console.error('Auth error:', err)
        router.push('/login?error=unknown')
      }
    }

    handleAuth()
  }, [router])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid #1f1f1f',
        borderTop: '3px solid #00D18B',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <p style={{ color: '#888888', fontSize: '14px' }}>
        Connexion en cours...
      </p>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
