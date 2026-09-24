'use client'

import { useState, useMemo } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  countDistinctLeads,
  dedupeEventsByLead,
  enrichEventsWithLeadSnapshots,
  filterEventsByDateRange,
  latestEventByLead,
  splitLeadEvents,
} from '@/lib/lead-events'
import {
  DollarSign,
  TrendingDown,
  Target,
  Calendar,
  UserCheck,
  Trophy,
  UserX,
  Send,
} from 'lucide-react'
import {
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  LabelList,
} from 'recharts'

const chartCardStyle = {
  background: '#111111',
  border: '1px solid #1f1f1f',
  borderRadius: '12px',
  padding: '24px',
  width: '100%',
  overflow: 'hidden',
}

const tooltipStyle = {
  background: '#161616',
  border: '1px solid #2f2f2f',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '13px',
}

const selectStyle = {
  background: '#0a0a0a',
  border: '1px solid #1f1f1f',
  color: '#ffffff',
  padding: '8px 12px',
  borderRadius: '8px',
  fontSize: '14px',
  outline: 'none',
  minWidth: '150px',
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

const labelStyle = {
  color: '#888888',
  fontSize: '12px',
  fontWeight: 500,
  display: 'block',
  marginBottom: '6px',
}

const SETTING_STATUSES = [
  'Lead Qualifié',
  'Lead Non qualifié',
  'Lead Non traité',
  'NRP',
  'NRP +1',
  'NRP +2',
  'NRP +3',
  'NRP +4',
  'NRP +',
]

const CLOSING_STATUSES = [
  'Deal',
  'No-Show',
  'Deal Qualifié',
  'Deal Non Qualifié',
  'Proposal Sent',
  'Proposal Signed',
  'Deal Won',
  'Deal Lost',
]

const POSITIVE_CLOSING_STATUSES = ['Deal', 'Deal Qualifié', 'Proposal Sent', 'Proposal Signed', 'Deal Won']

function formatCurrency(val) {
  if (val == null || isNaN(val)) return '0,00 €'
  return val.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

function formatNumber(val) {
  if (val == null || isNaN(val)) return '0'
  return val.toLocaleString('fr-FR')
}

const formatEuro = (value) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

const CustomLabel = ({ x, width, value }) => {
  if (!value || value === 0) return null
  
  // Toutes les valeurs sur la même ligne, en haut du graphique
  const labelY = 65
  const cx = x + width * 2.0

  return (
    <text
      x={cx}
      y={labelY}
      fill="#cccccc"
      textAnchor="end"
      fontSize={10}
      fontWeight={500}
      transform={`rotate(-45, ${cx}, ${labelY})`}
    >
      {formatEuro(value)}
    </text>
  )
}

function filterSpend(spend, filters) {
  const hasPlatform = spend.some((row) => row.platform !== null && row.platform !== undefined)
  const hasSocial = spend.some((row) => row.social_network !== null && row.social_network !== undefined)
  return spend.filter((d) => {
    const date = d.spend_date?.split('T')[0]
    if (date && filters.startDate && date < filters.startDate) return false
    if (date && filters.endDate && date > filters.endDate) return false
    if (filters.platform && hasPlatform && d.platform !== filters.platform) return false
    if (filters.social && hasSocial && d.social_network !== filters.social) return false
    return true
  })
}

function filterEventDimensions(events, filters) {
  let data = filterEventsByDateRange(events, filters.startDate, filters.endDate)
  if (filters.platform) data = data.filter((event) => event.platform === filters.platform)
  if (filters.social) data = data.filter((event) => event.social_network === filters.social)
  return data
}

function KpiCard({ icon: Icon, label, value, sub }) {
  return (
    <div
      style={{
        background: '#111111',
        border: '1px solid #1f1f1f',
        borderRadius: '12px',
        padding: '24px',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: '#00D18B15',
          padding: '8px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={20} color="#00D18B" />
      </div>
      <p
        style={{
          color: '#888888',
          fontSize: '12px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '8px',
        }}
      >
        {label}
      </p>
      <p style={{ fontSize: '28px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
        {value}
      </p>
      {sub && (
        <p style={{ color: '#888888', fontSize: '13px', marginTop: '8px' }}>{sub}</p>
      )}
    </div>
  )
}

const FILTER_DEFAULTS = {
  startDate: '',
  endDate: '',
  platform: '',
  social: '',
}

export default function CostsContent({ spendData, leadsData }) {
  const [input, setInput] = useState({ ...FILTER_DEFAULTS })
  const [applied, setApplied] = useState({ ...FILTER_DEFAULTS })

  const { leadCreatedEvents, settingEvents, closingEvents } = useMemo(
    () => splitLeadEvents(leadsData),
    [leadsData]
  )
  const enrichedSettingEvents = useMemo(
    () => enrichEventsWithLeadSnapshots(settingEvents, leadCreatedEvents),
    [settingEvents, leadCreatedEvents]
  )
  const enrichedClosingEvents = useMemo(
    () => enrichEventsWithLeadSnapshots(closingEvents, leadCreatedEvents),
    [closingEvents, leadCreatedEvents]
  )

  const allPlatforms = useMemo(
    () => [...new Set(leadsData.map((l) => l.platform).filter(Boolean))].sort(),
    [leadsData]
  )
  const allSocials = useMemo(
    () => [...new Set(leadsData.map((l) => l.social_network).filter(Boolean))].sort(),
    [leadsData]
  )

  const setFilter = (key, value) => {
    setInput((prev) => ({ ...prev, [key]: value }))
  }

  const applyFilters = () => {
    setApplied({ ...input })
  }

  const resetFilters = () => {
    setInput({ ...FILTER_DEFAULTS })
    setApplied({ ...FILTER_DEFAULTS })
  }

  const filteredLeads = useMemo(
    () => dedupeEventsByLead(filterEventDimensions(leadCreatedEvents, applied)),
    [leadCreatedEvents, applied]
  )
  const filteredSettingEvents = useMemo(
    () => filterEventDimensions(enrichedSettingEvents, applied),
    [enrichedSettingEvents, applied]
  )
  const filteredClosingEvents = useMemo(
    () => filterEventDimensions(enrichedClosingEvents, applied),
    [enrichedClosingEvents, applied]
  )
  const latestClosingEvents = useMemo(
    () => latestEventByLead(filteredClosingEvents),
    [filteredClosingEvents]
  )

  const filteredSpend = useMemo(
    () => filterSpend(spendData, applied),
    [spendData, applied]
  )

  const totalSpend = useMemo(
    () => filteredSpend.reduce((sum, d) => sum + Number(d.spend || 0), 0),
    [filteredSpend]
  )

  const cpmSum = useMemo(
    () => filteredSpend.reduce((sum, d) => sum + Number(d.cpm || 0), 0),
    [filteredSpend]
  )

  const cpmCount = filteredSpend.length
  const avgCpm = cpmCount > 0 ? cpmSum / cpmCount : 0

  const totalLeads = countDistinctLeads(filteredLeads)

  // Un RDV correspond à un lead qualifié en Setting, comme sur les pages
  // Closing/Setting — pas "tout lead ayant un statut Closing", qui mélangeait
  // ici des issues (No-Show compris) avec le nombre de RDV programmés.
  const totalRdv = useMemo(
    () => countDistinctLeads(filteredSettingEvents, (l) => l.setting_status?.toLowerCase() === 'lead qualifié'),
    [filteredSettingEvents]
  )

  const noShow = useMemo(
    () => countDistinctLeads(latestClosingEvents, (l) => l.closing_status === 'No-Show'),
    [latestClosingEvents]
  )

  const dealQualifies = useMemo(
    () => countDistinctLeads(filteredClosingEvents, (l) => l.closing_status?.toLowerCase() === 'deal qualifié'),
    [filteredClosingEvents]
  )

  const proposalSent = useMemo(
    () => countDistinctLeads(filteredClosingEvents, (l) => l.closing_status?.toLowerCase() === 'proposal sent'),
    [filteredClosingEvents]
  )

  const dealWon = useMemo(
    () => countDistinctLeads(filteredClosingEvents, (l) => l.closing_status?.toLowerCase() === 'deal won'),
    [filteredClosingEvents]
  )

  const cpl = totalLeads > 0 ? totalSpend / totalLeads : 0
  const cpDeal = totalRdv > 0 ? totalSpend / totalRdv : 0
  const cpDealQl = dealQualifies > 0 ? totalSpend / dealQualifies : 0
  const cpDealWon = dealWon > 0 ? totalSpend / dealWon : 0
  const cpNoShow = noShow > 0 ? totalSpend / noShow : 0
  const cpProposalSent = proposalSent > 0 ? totalSpend / proposalSent : 0

  const dailyData = useMemo(() => {
    const days = {}
    filteredSpend.forEach((d) => {
      const date = d.spend_date?.split('T')[0]
      if (date) {
        if (!days[date]) days[date] = { date, spend: 0 }
        days[date].spend += Number(d.spend || 0)
      }
    })
    return Object.entries(days)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v)
  }, [filteredSpend])

  const settingCostData = useMemo(() => {
    return SETTING_STATUSES.map((status) => {
      const count = countDistinctLeads(filteredSettingEvents, (l) => l.setting_status?.toLowerCase() === status?.toLowerCase())
      return {
        status,
        count,
        cost: count > 0 ? totalSpend / count : 0,
      }
    }).filter((d) => d.count > 0)
  }, [filteredSettingEvents, totalSpend])

  const closingCostData = useMemo(() => {
    return CLOSING_STATUSES.map((status) => {
      const count = countDistinctLeads(filteredClosingEvents, (l) => l.closing_status?.toLowerCase() === status?.toLowerCase())
      return {
        status,
        count,
        cost: count > 0 ? totalSpend / count : 0,
      }
    }).filter((d) => d.count > 0)
  }, [filteredClosingEvents, totalSpend])

  const campaignCplData = useMemo(() => {
    const leadsMap = {}
    filteredLeads.forEach((l) => {
      const name = l.campaign_name || 'N/A'
      if (!leadsMap[name]) leadsMap[name] = new Set()
      leadsMap[name].add(l.lead_id)
    })

    const spendMap = {}
    filteredSpend.forEach((d) => {
      const name = d.campaign_name || 'N/A'
      if (!spendMap[name]) spendMap[name] = 0
      spendMap[name] += Number(d.spend || 0)
    })

    const allNames = new Set([...Object.keys(spendMap), ...Object.keys(leadsMap)])
    return Array.from(allNames)
      .map((name) => {
        const s = spendMap[name] || 0
        const leadCount = leadsMap[name]?.size || 0
        return {
          campaign: name,
          cpl: leadCount > 0 ? s / leadCount : 0,
        }
      })
      .filter((d) => d.cpl > 0)
      .sort((a, b) => b.cpl - a.cpl)
  }, [filteredLeads, filteredSpend])

  const campaignTableData = useMemo(() => {
    const spendMap = {}
    filteredSpend.forEach((d) => {
      const name = d.campaign_name || 'N/A'
      if (!spendMap[name]) spendMap[name] = 0
      spendMap[name] += Number(d.spend || 0)
    })

    // Leads réels du CRM (fact_lead_events), pas le leads_count brut des lignes
    // de dépense — ce champ vient de la plateforme pub / Airtable et n'a aucun
    // rapport fiable avec les leads réellement entrés dans le CRM.
    const realLeadsMap = {}
    filteredLeads.forEach((l) => {
      const name = l.campaign_name || 'N/A'
      if (!realLeadsMap[name]) realLeadsMap[name] = new Set()
      realLeadsMap[name].add(l.lead_id)
    })

    const statusMap = {}
    filteredSettingEvents.forEach((l) => {
      const name = l.campaign_name || 'N/A'
      if (!statusMap[name]) statusMap[name] = { qualifiedIds: new Set(), dealWonIds: new Set() }
      if (l.setting_status?.toLowerCase() === 'lead qualifié') statusMap[name].qualifiedIds.add(l.lead_id)
    })
    filteredClosingEvents.forEach((l) => {
      const name = l.campaign_name || 'N/A'
      if (!statusMap[name]) statusMap[name] = { qualifiedIds: new Set(), dealWonIds: new Set() }
      if (l.closing_status?.toLowerCase() === 'deal won') statusMap[name].dealWonIds.add(l.lead_id)
    })

    const allNames = new Set([...Object.keys(spendMap), ...Object.keys(realLeadsMap), ...Object.keys(statusMap)])
    return Array.from(allNames)
      .map((name) => {
        const s = spendMap[name] || 0
        const leadCount = realLeadsMap[name]?.size || 0
        const l = statusMap[name] || { qualifiedIds: new Set(), dealWonIds: new Set() }
        const qualified = l.qualifiedIds.size
        const campaignDealWon = l.dealWonIds.size
        return {
          campaign: name,
          spend: s,
          leads: leadCount,
          cpl: leadCount > 0 ? s / leadCount : 0,
          qualified,
          cpql: qualified > 0 ? s / qualified : 0,
          dealWon: campaignDealWon,
          cpDealWon: campaignDealWon > 0 ? s / campaignDealWon : 0,
        }
      })
      .sort((a, b) => b.spend - a.spend)
  }, [filteredSpend, filteredLeads, filteredSettingEvents, filteredClosingEvents])

  const IconsRow1 = [DollarSign, TrendingDown, Target]
  const IconsRow2 = [Calendar, UserCheck, Trophy]
  const IconsRow3 = [UserX, Send]

  const kpiRows = [
    [
      { label: 'Dépense Totale', value: formatCurrency(totalSpend) },
      { label: 'CPM', value: formatCurrency(avgCpm) },
      { label: 'CPL', value: formatCurrency(cpl), sub: `${formatNumber(totalLeads)} leads` },
    ],
    [
      { label: 'CP Deal', value: formatCurrency(cpDeal), sub: `${formatNumber(totalRdv)} RDV` },
      { label: 'CP Deal QL', value: formatCurrency(cpDealQl), sub: `${formatNumber(dealQualifies)} deals qualifiés` },
      { label: 'CP Deal Won', value: formatCurrency(cpDealWon), sub: `${formatNumber(dealWon)} deals won` },
    ],
    [
      { label: 'CP No Show', value: formatCurrency(cpNoShow), sub: `${formatNumber(noShow)} no show` },
      { label: 'CP Proposal Sent', value: formatCurrency(cpProposalSent), sub: `${formatNumber(proposalSent)} proposals` },
    ],
  ]

  const kpiIconRows = [IconsRow1, IconsRow2, IconsRow3]

  return (
    <div
      style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Filter bar */}
      <div
        style={{
          background: '#161616',
          border: '1px solid #1f1f1f',
          borderRadius: '12px',
          padding: '20px 24px',
          display: 'flex',
          gap: '20px',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <label style={labelStyle}>Date début</label>
          <input
            type="date"
            value={input.startDate}
            onChange={(e) => setFilter('startDate', e.target.value)}
            style={inputDateStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Date fin</label>
          <input
            type="date"
            value={input.endDate}
            onChange={(e) => setFilter('endDate', e.target.value)}
            style={inputDateStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Plateforme</label>
          <select
            value={input.platform}
            onChange={(e) => setFilter('platform', e.target.value)}
            style={selectStyle}
          >
            <option value="">Toutes</option>
            {allPlatforms.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Réseau social</label>
          <select
            value={input.social}
            onChange={(e) => setFilter('social', e.target.value)}
            style={selectStyle}
          >
            <option value="">Tous</option>
            {allSocials.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <button
          onClick={applyFilters}
          style={{
            background: '#00D18B',
            border: 'none',
            color: '#000000',
            padding: '8px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          Appliquer
        </button>
        <button
          onClick={resetFilters}
          style={{
            background: 'transparent',
            border: '1px solid #1f1f1f',
            color: '#888888',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          Réinitialiser
        </button>
      </div>

      {/* KPI rows */}
      {kpiRows.map((row, rowIdx) => (
        <div
          key={rowIdx}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
            width: '100%',
          }}
        >
          {row.map((kpi, colIdx) => (
            <KpiCard
              key={kpi.label}
              icon={kpiIconRows[rowIdx][colIdx]}
              label={kpi.label}
              value={kpi.value}
              sub={kpi.sub}
            />
          ))}
        </div>
      ))}

      {/* Daily spend line chart */}
      <div style={chartCardStyle}>
        <p style={{ color: '#ffffff', fontSize: '15px', fontWeight: 600, marginBottom: '20px' }}>
          Dépenses par jour
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
            <XAxis dataKey="date" stroke="#888888" tick={{ fontSize: 12 }} />
            <YAxis
              stroke="#888888"
              tick={{ fontSize: 12 }}
              tickFormatter={(v) => formatCurrency(v)}
            />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v)} />
            <Area
              type="monotone"
              dataKey="spend"
              stroke="#00D18B"
              fill="#00D18B"
              fillOpacity={0.08}
            />
            <Line
              type="monotone"
              dataKey="spend"
              stroke="#00D18B"
              strokeWidth={2}
              dot={{ fill: '#00D18B', r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Setting + Closing cost bars 50/50 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%' }}>
        <div style={chartCardStyle}>
          <p style={{ color: '#ffffff', fontSize: '15px', fontWeight: 600, marginBottom: '20px' }}>
            Coûts par statut Setting
          </p>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={settingCostData} margin={{ top: 80, right: 20, bottom: 90, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
              <XAxis dataKey="status" stroke="#888888" tick={{ fill: '#888888', fontSize: 11 }} angle={-35} textAnchor="end" height={90} interval={0} dy={10} />
              <YAxis stroke="#888888" tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v)} />
              <Bar dataKey="cost" fill="#FFB347" radius={[4, 4, 0, 0]} label={<CustomLabel />} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={chartCardStyle}>
          <p style={{ color: '#ffffff', fontSize: '15px', fontWeight: 600, marginBottom: '20px' }}>
            Coûts par statut Closing
          </p>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={closingCostData} margin={{ top: 80, right: 20, bottom: 90, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
              <XAxis dataKey="status" stroke="#888888" tick={{ fill: '#888888', fontSize: 11 }} angle={-35} textAnchor="end" height={90} interval={0} dy={10} />
              <YAxis stroke="#888888" tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v)} />
              <Bar dataKey="cost" radius={[4, 4, 0, 0]} label={<CustomLabel />}>
                {closingCostData.map((entry, i) => (
                  <Cell key={i} fill={POSITIVE_CLOSING_STATUSES.includes(entry.status) ? '#00D18B' : '#0088FE'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CPL by campaign bar chart */}
      <div style={chartCardStyle}>
        <p style={{ color: '#ffffff', fontSize: '15px', fontWeight: 600, marginBottom: '20px' }}>
          CPL par campagne
        </p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={campaignCplData} layout="vertical" margin={{ top: 5, right: 80, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
              <XAxis type="number" stroke="#888888" tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
              <YAxis
                type="category"
                dataKey="campaign"
                stroke="#888888"
                tick={{ fontSize: 11 }}
                width={180}
                tickFormatter={(val) => val.length > 30 ? val.slice(0, 30) + '...' : val}
              />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v)} />
              <Bar dataKey="cpl" fill="#00D18B" radius={[0, 4, 4, 0]}>
                <LabelList dataKey="cpl" position="right" offset={8} angle={0} fill="#ffffff" fontSize={12} textAnchor="start" formatter={(v) => `${v.toFixed(2)} €`} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
      </div>

      {/* Campaign table */}
      <div style={chartCardStyle}>
        <p style={{ color: '#ffffff', fontSize: '15px', fontWeight: 600, marginBottom: '20px' }}>
          Détail par campagne
        </p>
        <div style={{ overflowX: 'auto' }}>
          <Table>
            <TableHeader>
              <TableRow style={{ background: '#161616', borderBottom: '1px solid #1f1f1f' }}>
                <TableHead style={{ color: '#888888', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Campagne
                </TableHead>
                <TableHead style={{ color: '#888888', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Dépenses
                </TableHead>
                <TableHead style={{ color: '#888888', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Leads
                </TableHead>
                <TableHead style={{ color: '#888888', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  CPL
                </TableHead>
                <TableHead style={{ color: '#888888', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Leads Qualifiés
                </TableHead>
                <TableHead style={{ color: '#888888', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  CPQL
                </TableHead>
                <TableHead style={{ color: '#888888', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Deal Won
                </TableHead>
                <TableHead style={{ color: '#888888', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  CP Deal Won
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaignTableData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} style={{ color: '#888888', textAlign: 'center', padding: '32px' }}>
                    Aucune donnée disponible.
                  </TableCell>
                </TableRow>
              )}
              {campaignTableData.map((row, i) => (
                <TableRow
                  key={row.campaign}
                  style={{
                    background: i % 2 === 0 ? '#111111' : '#0d0d0d',
                    borderBottom: '1px solid #1f1f1f',
                  }}
                >
                  <TableCell style={{ color: '#ffffff', fontSize: '14px' }}>
                    {row.campaign}
                  </TableCell>
                  <TableCell style={{ color: '#ffffff', fontSize: '14px', fontWeight: 600 }}>
                    {formatCurrency(row.spend)}
                  </TableCell>
                  <TableCell style={{ color: '#ffffff', fontSize: '14px' }}>
                    {formatNumber(row.leads)}
                  </TableCell>
                  <TableCell style={{ color: '#ffffff', fontSize: '14px' }}>
                    {formatCurrency(row.cpl)}
                  </TableCell>
                  <TableCell>
                    <span style={{ display: 'inline-block', background: '#00D18B20', color: '#00D18B', borderRadius: '6px', padding: '3px 10px', fontSize: '12px', fontWeight: 500 }}>
                      {formatNumber(row.qualified)}
                    </span>
                  </TableCell>
                  <TableCell style={{ color: '#ffffff', fontSize: '14px' }}>
                    {formatCurrency(row.cpql)}
                  </TableCell>
                  <TableCell>
                    <span style={{ display: 'inline-block', background: '#00D18B20', color: '#00D18B', borderRadius: '6px', padding: '3px 10px', fontSize: '12px', fontWeight: 500 }}>
                      {formatNumber(row.dealWon)}
                    </span>
                  </TableCell>
                  <TableCell style={{ color: '#ffffff', fontSize: '14px' }}>
                    {formatCurrency(row.cpDealWon)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
