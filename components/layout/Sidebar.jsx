'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Users,
  CalendarCheck,
  Handshake,
  BarChart3,
  DollarSign,
  Settings,
  Home,
} from 'lucide-react'

const dashboards = [
  { label: 'Accueil', href: '/dashboard', icon: Home },
  { label: 'Leads', href: '/dashboard/leads', icon: Users },
  { label: 'Setting', href: '/dashboard/setting', icon: CalendarCheck },
  { label: 'Closing', href: '/dashboard/closing', icon: Handshake },
  { label: 'Ads Performance', href: '/dashboard/ads', icon: BarChart3 },
  { label: 'Coûts', href: '/dashboard/costs', icon: DollarSign },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      style={{
        width: '240px',
        minHeight: '100vh',
        background: '#111111',
        borderRight: '1px solid #1f1f1f',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 12px',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 50,
      }}
    >
      {/* Logo */}
      <div style={{ padding: '0 12px 24px' }}>
        <span
          style={{
            color: '#00D18B',
            fontWeight: 800,
            fontSize: '18px',
            letterSpacing: '-0.02em',
          }}
        >
          AICLIENTLY
        </span>
      </div>

      {/* Separator */}
      <div style={{ height: '1px', background: '#1f1f1f', margin: '0 0 8px' }} />

      {/* Section DASHBOARDS */}
      <div
        style={{
          color: '#888888',
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          padding: '20px 12px 8px',
        }}
      >
        DASHBOARDS
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {dashboards.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                paddingLeft: isActive ? '10px' : '12px',
                borderRadius: '8px',
                color: isActive ? '#00D18B' : '#888888',
                background: isActive ? '#00D18B15' : 'transparent',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: isActive ? 500 : 400,
                borderLeft: isActive ? '2px solid #00D18B' : '2px solid transparent',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = '#1a1a1a'
                  e.currentTarget.style.color = '#ffffff'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = '#888888'
                }
              }}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Separator */}
      <div style={{ height: '1px', background: '#1f1f1f', margin: 'auto 0 8px' }} />

      {/* Section SETTINGS */}
      <Link
        href="/dashboard/setting"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 12px',
          borderRadius: '8px',
          color: '#888888',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: 400,
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#1a1a1a'
          e.currentTarget.style.color = '#ffffff'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = '#888888'
        }}
      >
        <Settings size={16} />
        SETTINGS
      </Link>
    </aside>
  )
}
