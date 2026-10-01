'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useDashboardData } from '@/lib/DashboardDataContext'
import { clientPath } from '@/lib/client-routes'
import {
  Users,
  CalendarCheck,
  Handshake,
  BarChart3,
  DollarSign,
  Settings,
  Home,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'

const dashboards = [
  { label: 'Accueil', page: '', icon: Home },
  { label: 'Leads', page: 'leads', icon: Users },
  { label: 'Setting', page: 'setting', icon: CalendarCheck },
  { label: 'Closing', page: 'closing', icon: Handshake },
  { label: 'Ads Performance', page: 'ads', icon: BarChart3 },
  { label: 'Coûts', page: 'costs', icon: DollarSign },
]

const sectionLabelStyle = {
  color: '#888888',
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
}

function NavLink({ href, label, icon: Icon, isActive, collapsed }) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: '10px',
        padding: '10px 12px',
        paddingLeft: collapsed ? '12px' : isActive ? '10px' : '12px',
        borderRadius: '8px',
        color: isActive ? '#00D18B' : '#888888',
        background: isActive ? '#00D18B15' : 'transparent',
        textDecoration: 'none',
        fontSize: '14px',
        fontWeight: isActive ? 500 : 400,
        borderLeft: isActive && !collapsed ? '2px solid #00D18B' : '2px solid transparent',
        whiteSpace: 'nowrap',
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
      <Icon size={16} style={{ flexShrink: 0 }} />
      {!collapsed && label}
    </Link>
  )
}

export default function Sidebar({ collapsed = false, width = 240, onToggle }) {
  const pathname = usePathname()
  const { clients, clientSchema, selectClient } = useDashboardData()
  const slug = clientSchema?.slug
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose

  return (
    <aside
      style={{
        width: `${width}px`,
        minHeight: '100vh',
        background: '#111111',
        borderRight: '1px solid #1f1f1f',
        display: 'flex',
        flexDirection: 'column',
        padding: collapsed ? '20px 8px' : '20px 12px',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 50,
        overflow: 'hidden',
        transition: 'width 0.2s ease, padding 0.2s ease',
      }}
    >
      {/* Logo + bouton replier/déplier */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        padding: collapsed ? '0 0 24px' : '0 4px 24px 12px',
      }}>
        {!collapsed && (
          <span style={{ color: '#00D18B', fontWeight: 800, fontSize: '18px', letterSpacing: '-0.02em' }}>
            AICLIENTLY
          </span>
        )}
        <button
          onClick={onToggle}
          title={collapsed ? 'Déplier le menu' : 'Replier le menu'}
          aria-label={collapsed ? 'Déplier le menu' : 'Replier le menu'}
          aria-expanded={!collapsed}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#888888',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
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
          <ToggleIcon size={18} />
        </button>
      </div>

      {/* Client */}
      {clientSchema && !collapsed && (
        <div style={{ padding: '0 12px 16px' }}>
          <div style={{ ...sectionLabelStyle, marginBottom: '6px' }}>Client</div>
          {clients.length > 1 ? (
            <select
              aria-label="Choisir le client"
              value={clientSchema.slug}
              onChange={(e) => selectClient(e.target.value)}
              style={{
                width: '100%',
                background: '#0a0a0a',
                border: '1px solid #1f1f1f',
                color: '#ffffff',
                padding: '8px 10px',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {clients.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
          ) : (
            <div style={{ color: '#ffffff', fontSize: '14px', fontWeight: 500 }}>
              {clientSchema.name}
            </div>
          )}
        </div>
      )}

      {/* Separator */}
      <div style={{ height: '1px', background: '#1f1f1f', margin: '0 0 8px' }} />

      {/* Section DASHBOARDS */}
      {!collapsed && (
        <div style={{ ...sectionLabelStyle, padding: '20px 12px 8px' }}>DASHBOARDS</div>
      )}

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: collapsed ? '12px' : 0 }}>
        {dashboards.map((item) => {
          const href = clientPath(slug, item.page)
          return (
            <NavLink
              key={item.page || 'accueil'}
              href={href}
              label={item.label}
              icon={item.icon}
              isActive={pathname === href}
              collapsed={collapsed}
            />
          )
        })}
      </nav>

      {/* Separator */}
      <div style={{ height: '1px', background: '#1f1f1f', margin: 'auto 0 8px' }} />

      {/* Section SETTINGS */}
      <NavLink
        href={clientPath(slug, 'setting')}
        label="SETTINGS"
        icon={Settings}
        isActive={false}
        collapsed={collapsed}
      />
    </aside>
  )
}
