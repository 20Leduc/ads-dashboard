'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Header({ clientName }) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const displayName = clientName || 'Client'
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  return (
    <header
      style={{
        height: '64px',
        borderBottom: '1px solid #1f1f1f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '0 32px',
        background: '#0a0a0a',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {/* Avatar */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          title="Mon compte"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: '#00D18B',
            border: 'none',
            cursor: 'pointer',
            color: '#000000',
            fontWeight: 700,
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          {initials}
        </button>

        {menuOpen && (
          <>
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99,
              }}
              onClick={() => setMenuOpen(false)}
            />
            <div
              style={{
                position: 'absolute',
                top: '44px',
                right: 0,
                background: '#161616',
                border: '1px solid #2f2f2f',
                borderRadius: '10px',
                padding: '8px',
                minWidth: '180px',
                zIndex: 100,
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              }}
            >
              {clientName && (
                <div
                  style={{
                    padding: '8px 12px',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 500,
                    borderBottom: '1px solid #1f1f1f',
                    marginBottom: '8px',
                  }}
                >
                  {clientName}
                </div>
              )}
              <button
                onClick={handleLogout}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'transparent',
                  border: 'none',
                  color: '#ff4444',
                  cursor: 'pointer',
                  fontSize: '13px',
                  textAlign: 'left',
                  borderRadius: '6px',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = '#1f1f1f')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
              >
                Se déconnecter
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
