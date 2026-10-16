'use client'

import { useMemo, useState } from 'react'
import { Users, UserCheck, Handshake, BadgeCheck, Trophy, Wallet, Coins } from 'lucide-react'
import { eventDay } from '@/lib/lead-events'
import { buildOverview, periodRange } from '@/lib/overview'

const PRESETS = [
  { key: 'month', label: 'Mois en cours' },
  { key: 'last-month', label: 'Mois dernier' },
  { key: '30-days', label: '30 derniers jours' },
  { key: 'all', label: 'Tout' },
]

const cardStyle = {
  background: '#111111',
  border: '1px solid #1f1f1f',
  borderRadius: '12px',
  padding: '20px',
  minWidth: 0,
}

const inputDateStyle = {
  background: '#0a0a0a',
  border: '1px solid #1f1f1f',
  color: '#ffffff',
  colorScheme: 'dark',
  padding: '8px 12px',
  borderRadius: '8px',
  fontSize: '14px',
  outline: 'none',
}

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '16px',
}

const formatNumber = (value) => value.toLocaleString('fr-FR')
const formatCurrency = (value) => (value === null
  ? '—'
  : value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }))

function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '12px' }}>
        <p style={{ color: '#888888', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
          {label}
        </p>
        <span style={{ background: '#00D18B15', padding: '6px', borderRadius: '8px', display: 'flex' }} aria-hidden="true">
          <Icon size={16} color="#00D18B" />
        </span>
      </div>
      <p style={{ color: '#ffffff', fontSize: '26px', fontWeight: 700, margin: 0, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </p>
      <p style={{ color: '#666666', fontSize: '12px', margin: '8px 0 0' }}>{hint}</p>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h2 style={{ color: '#ffffff', fontSize: '15px', fontWeight: 600, margin: 0 }}>{title}</h2>
      <div style={gridStyle}>{children}</div>
    </section>
  )
}

// Page d'accueil : les chiffres clés de la période, avec les mêmes définitions
// que les pages Setting, Closing et Coûts.
export default function OverviewContent({ leads, spendData }) {
  const [today] = useState(() => eventDay(new Date().toISOString()))
  const [preset, setPreset] = useState('month')
  const [range, setRange] = useState(() => periodRange('month', today))

  const choosePreset = (key) => {
    setPreset(key)
    setRange(periodRange(key, today))
  }
  const setDate = (key, value) => {
    setPreset('custom')
    setRange((prev) => ({ ...prev, [key]: value }))
  }

  const overview = useMemo(
    () => buildOverview({ events: leads, spend: spendData, ...range }),
    [leads, spendData, range]
  )

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '28px', width: '100%', boxSizing: 'border-box' }}>
      <div
        style={{
          background: '#161616',
          border: '1px solid #1f1f1f',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          gap: '16px',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
        }}
      >
        <div role="group" aria-label="Période" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {PRESETS.map(({ key, label }) => {
            const active = preset === key
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                onClick={() => choosePreset(key)}
                style={{
                  background: active ? '#00D18B20' : 'transparent',
                  border: `1px solid ${active ? '#00D18B' : '#1f1f1f'}`,
                  color: active ? '#00D18B' : '#888888',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: active ? 600 : 500,
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <label style={{ color: '#888888', fontSize: '12px', fontWeight: 500, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            Du
            <input type="date" value={range.startDate} onChange={(e) => setDate('startDate', e.target.value)} style={inputDateStyle} />
          </label>
          <label style={{ color: '#888888', fontSize: '12px', fontWeight: 500, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            Au
            <input type="date" value={range.endDate} onChange={(e) => setDate('endDate', e.target.value)} style={inputDateStyle} />
          </label>
        </div>
      </div>

      <Section title="Volumes">
        <StatCard icon={Users} label="Leads" value={formatNumber(overview.leads)} hint="Leads entrés sur la période" />
        <StatCard icon={UserCheck} label="Leads qualifiés" value={formatNumber(overview.qualifiedLeads)} hint="Statut Setting « Lead qualifié »" />
        <StatCard icon={Handshake} label="Deals" value={formatNumber(overview.deals)} hint="Leads entrés en Closing (RDV pris)" />
        <StatCard icon={BadgeCheck} label="Deals qualifiés" value={formatNumber(overview.qualifiedDeals)} hint="Deal Qualifié, Deal Won compris" />
        <StatCard icon={Trophy} label="Deals won" value={formatNumber(overview.dealsWon)} hint="Deals gagnés sur la période" />
      </Section>

      <Section title="Coûts">
        <StatCard icon={Wallet} label="Dépense totale" value={formatCurrency(overview.spend)} hint="Dépense publicitaire de la période" />
        <StatCard icon={Coins} label="Coût par lead" value={formatCurrency(overview.costPerLead)} hint={`Sur ${formatNumber(overview.leads)} leads`} />
        <StatCard icon={Coins} label="Coût par lead qualifié" value={formatCurrency(overview.costPerQualifiedLead)} hint={`Sur ${formatNumber(overview.qualifiedLeads)} leads qualifiés`} />
        <StatCard icon={Coins} label="Coût par deal" value={formatCurrency(overview.costPerDeal)} hint={`Sur ${formatNumber(overview.deals)} deals`} />
        <StatCard icon={Coins} label="Coût par deal qualifié" value={formatCurrency(overview.costPerQualifiedDeal)} hint={`Sur ${formatNumber(overview.qualifiedDeals)} deals qualifiés`} />
      </Section>
    </div>
  )
}
