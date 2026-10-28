'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { emailMatchesHint, inviteStatusMessage, isInviteCode } from '@/lib/invite'

const card = {
  background: '#111111',
  border: '1px solid #1f1f1f',
  borderRadius: '16px',
  padding: '40px',
  width: '100%',
  maxWidth: '420px',
  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  boxSizing: 'border-box',
}
const text = { color: '#888888', fontSize: '14px', lineHeight: 1.5, margin: 0 }
const button = {
  width: '100%',
  background: '#00D18B',
  color: '#0a0a0a',
  border: 'none',
  borderRadius: '8px',
  padding: '12px 16px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
}

// Lien d'invitation /invite/<code> : présente l'invitation (client, email masqué)
// et envoie le lien de connexion. Le compte est rattaché au client à la
// connexion, uniquement si son email est celui de l'invitation.
export default function InvitePage() {
  const { code } = useParams()
  const router = useRouter()
  const [invite, setInvite] = useState(undefined)
  const [sessionEmail, setSessionEmail] = useState(null)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSessionEmail(session?.user?.email ?? null)
      if (!isInviteCode(code)) { setInvite(null); return }
      const { data } = await supabase.rpc('get_client_invite', { p_code: code })
      setInvite(Array.isArray(data) && data[0] ? data[0] : null)
    }
    load()
  }, [code])

  const sendLink = async (e) => {
    e.preventDefault()
    if (!emailMatchesHint(email, invite.email_hint)) {
      setErrorMsg(`Cette adresse ne correspond pas à l'invitation (${invite.email_hint}).`)
      setStatus('error')
      return
    }
    setStatus('loading')
    setErrorMsg('')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin + '/auth/callback' },
    })
    if (error) {
      setErrorMsg(error.message || 'Erreur inconnue')
      setStatus('error')
    } else {
      setStatus('sent')
    }
  }

  const message = invite === null ? inviteStatusMessage('missing') : invite && inviteStatusMessage(invite.status, invite.client_name)

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', boxSizing: 'border-box' }}>
      <div style={card}>
        <p style={{ textAlign: 'center', color: '#00D18B', fontWeight: 800, fontSize: '22px', letterSpacing: '-0.02em', margin: '0 0 8px' }}>
          AICLIENTLY
        </p>

        {invite === undefined ? (
          <p style={{ ...text, textAlign: 'center' }}>Chargement de l’invitation…</p>
        ) : message ? (
          <p style={{ ...text, textAlign: 'center' }}>{message}</p>
        ) : (
          <>
            <p style={{ textAlign: 'center', color: '#ffffff', fontSize: '16px', fontWeight: 600, margin: '0 0 24px' }}>
              Invitation au dashboard {invite.client_name}
            </p>

            {status === 'sent' ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#00D18B15', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Check size={24} color="#00D18B" />
                </div>
                <p style={{ color: '#ffffff', fontSize: '16px', fontWeight: 600, margin: '0 0 8px' }}>Vérifiez votre email</p>
                <p style={text}>
                  Un lien de connexion a été envoyé à <span style={{ color: '#ffffff' }}>{email.trim()}</span>.
                  En cliquant dessus, vous accédez au dashboard {invite.client_name}.
                </p>
              </div>
            ) : sessionEmail ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={text}>
                  Vous êtes connecté avec <span style={{ color: '#ffffff' }}>{sessionEmail}</span>.
                  {!emailMatchesHint(sessionEmail, invite.email_hint) &&
                    ` Cette invitation est réservée à ${invite.email_hint} : déconnectez-vous et reconnectez-vous avec cette adresse.`}
                </p>
                <button type="button" style={button} onClick={() => router.push('/dashboard')}>
                  Ouvrir le dashboard
                </button>
              </div>
            ) : (
              <form onSubmit={sendLink} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={text}>
                  Cette invitation est réservée à <span style={{ color: '#ffffff' }}>{invite.email_hint}</span>.
                  Saisissez cette adresse pour recevoir votre lien de connexion.
                </p>
                <input
                  type="email"
                  placeholder="votre@email.com"
                  aria-label="Votre adresse email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ width: '100%', background: '#161616', border: '1px solid #1f1f1f', borderRadius: '8px', padding: '12px 16px', color: '#ffffff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
                {status === 'error' && <p style={{ ...text, color: '#ef4444' }}>{errorMsg}</p>}
                <button type="submit" disabled={status === 'loading'} style={{ ...button, opacity: status === 'loading' ? 0.6 : 1 }}>
                  {status === 'loading' ? 'Envoi…' : 'Recevoir mon lien de connexion'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}
