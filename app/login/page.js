'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [isChecking, setIsChecking] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/dashboard')
        return
      }
      setIsChecking(false)
    }
    checkSession()
  }, [router])

  if (isChecking) return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        width: '32px',
        height: '32px',
        border: '3px solid #1f1f1f',
        borderTop: '3px solid #00D18B',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    setErrorMsg('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin + '/auth/callback',
      },
    })
    if (error) {
      setErrorMsg(error.message || 'Erreur inconnue')
      setStatus('error')
    } else {
      setStatus('sent')
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Logo flouté en arrière-plan */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '300px',
          fontWeight: 800,
          color: '#00D18B',
          opacity: 0.05,
          filter: 'blur(40px)',
          userSelect: 'none',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        AICLIENTLY
      </div>

      {/* Card login */}
      <div
        style={{
          background: '#111111',
          border: '1px solid #1f1f1f',
          borderRadius: '16px',
          padding: '40px',
          width: '100%',
          maxWidth: '420px',
          position: 'relative',
          zIndex: 1,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Logo */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: '8px',
          }}
        >
          <span
            style={{
              color: '#00D18B',
              fontWeight: 800,
              fontSize: '22px',
              letterSpacing: '-0.02em',
            }}
          >
            AICLIENTLY
          </span>
        </div>

        {/* Sous-titre */}
        <p
          style={{
            textAlign: 'center',
            color: '#888888',
            fontSize: '14px',
            marginBottom: '32px',
          }}
        >
          Accédez à votre dashboard
        </p>

        {status === 'sent' ? (
          /* Message de confirmation */
          <div
            style={{
              textAlign: 'center',
              padding: '24px 0',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#00D18B15',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Check size={24} color="#00D18B" />
            </div>
            <p
              style={{
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: 600,
                marginBottom: '8px',
              }}
            >
              Vérifiez votre email
            </p>
            <p
              style={{
                color: '#888888',
                fontSize: '14px',
              }}
            >
              Un lien de connexion a été envoyé à{' '}
              <span style={{ color: '#ffffff' }}>{email}</span>
            </p>
          </div>
        ) : (
          /* Formulaire */
          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                background: '#161616',
                border: '1px solid #1f1f1f',
                borderRadius: '8px',
                padding: '12px 16px',
                color: '#ffffff',
                fontSize: '14px',
                outline: 'none',
                marginBottom: '12px',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#00D18B')}
              onBlur={(e) => (e.target.style.borderColor = '#1f1f1f')}
            />

            {status === 'error' && (
              <p
                style={{
                  color: '#ff4444',
                  fontSize: '13px',
                  marginBottom: '12px',
                }}
              >
                Une erreur est survenue. Veuillez réessayer.
                {errorMsg && (
                  <span style={{ display: 'block', marginTop: '4px', color: '#ff8888', fontSize: '11px' }}>
                    {errorMsg}
                  </span>
                )}
              </p>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              style={{
                width: '100%',
                background: '#00D18B',
                color: '#000000',
                fontWeight: 700,
                fontSize: '14px',
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                opacity: status === 'loading' ? 0.7 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              {status === 'loading' ? 'Envoi en cours...' : 'Recevoir mon lien de connexion'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
