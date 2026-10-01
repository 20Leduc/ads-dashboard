'use client'

import { useState, useMemo } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  countDistinctLeads,
  dedupeEventsByKey,
  dedupeEventsByLead,
  enrichEventsWithLeadSnapshots,
  eventDay,
  filterEventsByDateRange,
  filterEventsByDimensions,
  isDealQualifiedStatus,
  isDealWonStatus,
  isNoShowStatus,
  isQualifiedStatus,
  latestEventByLead,
  splitLeadEvents,
} from '@/lib/lead-events'
import {
  Calendar,
  UserX,
  Percent,
  Briefcase,
  Trophy,
  TrendingUp,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from 'recharts'

const COLORS = ['#00D18B', '#0088FE', '#FF6B6B', '#FFB347', '#A78BFA', '#888888']

function aggregateBy(data, keyFn) {
  const map = {}
  data.forEach((l) => {
    const k = keyFn(l) || 'N/A'
    map[k] = (map[k] || 0) + 1
  })
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

function getTop5WithOthers(data, nameKey = 'name', valueKey = 'value') {
  const sorted = [...data].sort((a, b) => b[valueKey] - a[valueKey])
  const top5 = sorted.slice(0, 5)
  const others = sorted.slice(5)
  const othersTotal = others.reduce((sum, item) => sum + item[valueKey], 0)
  if (othersTotal > 0) {
    top5.push({ [nameKey]: 'Autres', [valueKey]: othersTotal })
  }
  return top5
}

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

function DonutWithLegend({ data, getColor = (i) => COLORS[i % COLORS.length] }) {
  const sortedLegend = [...data].sort((a, b) => {
    if (a.name === 'Autres') return 1
    if (b.name === 'Autres') return -1
    return 0
  })
  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: '0 0 42%', minWidth: 0 }}>
        {sortedLegend.map((entry, i) => {
          const colorIndex = data.findIndex((d) => d.name === entry.name)
          return (
            <li key={i} title={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', minWidth: 0 }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: getColor(colorIndex), display: 'inline-block', flexShrink: 0 }} />
              <span style={{ color: '#ffffff', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.name}</span>
            </li>
          )
        })}
      </ul>
      <div style={{ flex: '1 1 58%', minWidth: 0 }}>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={30}
              outerRadius={70}
              label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                const RADIAN = Math.PI / 180
                const radius = outerRadius + 15
                const x = cx + radius * Math.cos(-midAngle * RADIAN)
                const y = cy + radius * Math.sin(-midAngle * RADIAN)
                const textAnchor = x > cx ? 'start' : 'end'
                return (
                  <text x={x} y={y} fill="#ffffff" textAnchor={textAnchor} dominantBaseline="central" fontSize={10}>
                    {`${(percent * 100).toFixed(0)}%`}
                  </text>
                )
              }}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={getColor(i)} />
              ))}
            </Pie>
            <Tooltip formatter={(value, name) => [value, name]} contentStyle={{ background: '#161616', border: '1px solid #2f2f2f', borderRadius: '8px', color: '#ffffff' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default function ClosingContent({ leads }) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('')
  const [filterCampaign, setFilterCampaign] = useState('')
  const [filterSocial, setFilterSocial] = useState('')

  const { leadCreatedEvents, settingEvents, closingEvents } = useMemo(
    () => splitLeadEvents(leads),
    [leads]
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
    () => [...new Set(leads.map((l) => l.platform).filter(Boolean))].sort(),
    [leads]
  )
  const allCampaigns = useMemo(
    () => [...new Set(leads.map((l) => l.campaign_name).filter(Boolean))].sort(),
    [leads]
  )
  const allSocials = useMemo(
    () => [...new Set(leads.map((l) => l.social_network).filter(Boolean))].sort(),
    [leads]
  )

  const dimensionFilters = useMemo(
    () => ({ platform: filterPlatform, campaign: filterCampaign, social: filterSocial }),
    [filterPlatform, filterCampaign, filterSocial]
  )

  // RDV = lead dont le statut Setting ACTUEL est "Lead qualifié", daté par sa
  // date réelle ("Date Setting") — même chiffre que "Leads Qualifiés" sur
  // Setting et "Lead Qualifié" sur Leads.
  const rdvStatuses = useMemo(
    () => filterEventsByDimensions(
      filterEventsByDateRange(
        latestEventByLead(enrichedSettingEvents.filter((e) => e.setting_status)),
        startDate,
        endDate
      ),
      dimensionFilters
    ).filter((e) => isQualifiedStatus(e.setting_status)),
    [enrichedSettingEvents, startDate, endDate, dimensionFilters]
  )

  // Issues Closing datées par leur propre date (passage de stage côté GHL).
  // On n'exige pas que le lead soit encore "Lead qualifié" en Setting : un
  // No-Show recontacté puis repassé en NRP disparaîtrait sinon de cette page
  // alors qu'il compte sur Leads et Coûts.
  const datedClosingEvents = useMemo(
    () => filterEventsByDimensions(
      filterEventsByDateRange(enrichedClosingEvents, startDate, endDate),
      dimensionFilters
    ),
    [enrichedClosingEvents, startDate, endDate, dimensionFilters]
  )
  const uniqueStatusEvents = useMemo(
    () => dedupeEventsByKey(
      datedClosingEvents,
      (event) => `${event.closing_status || ''}\u0000${event.lead_id}`
    ),
    [datedClosingEvents]
  )
  const passedClosingEvents = useMemo(
    () => latestEventByLead(datedClosingEvents),
    [datedClosingEvents]
  )

  const total_rdv = rdvStatuses.length
  const no_show = countDistinctLeads(passedClosingEvents, (d) => isNoShowStatus(d.closing_status))
  // Un événement Closing "vide" marque une clôture explicite (lead retiré du pipeline
  // Closing) — il ne doit jamais compter comme un RDV passé résolu.
  const rdv_passes = countDistinctLeads(passedClosingEvents, (d) => Boolean(d.closing_status))
  const deal_qualifies = countDistinctLeads(datedClosingEvents, (d) => isDealQualifiedStatus(d.closing_status))
  const deal_won = countDistinctLeads(datedClosingEvents, (d) => isDealWonStatus(d.closing_status))

  const taux_no_show = rdv_passes > 0
    ? (no_show / rdv_passes * 100).toFixed(1)
    : 0
  const taux_deal_won = rdv_passes > 0
    ? (deal_won / rdv_passes * 100).toFixed(1)
    : 0

  const dailyData = useMemo(() => {
    const days = {}
    const ensureDay = (d) => {
      if (!days[d]) days[d] = { date: d, noShowIds: new Set(), dealWonIds: new Set(), dealQualifiedIds: new Set() }
      return days[d]
    }
    passedClosingEvents.forEach((l) => {
      const d = eventDay(l.event_at)
      if (d && isNoShowStatus(l.closing_status)) ensureDay(d).noShowIds.add(l.lead_id)
    })
    datedClosingEvents.forEach((l) => {
      const d = eventDay(l.event_at)
      if (!d || !isDealQualifiedStatus(l.closing_status)) return
      const day = ensureDay(d)
      day.dealQualifiedIds.add(l.lead_id)
      if (isDealWonStatus(l.closing_status)) day.dealWonIds.add(l.lead_id)
    })
    return Object.entries(days)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => ({
        date: value.date,
        noShow: value.noShowIds.size,
        dealWon: value.dealWonIds.size,
        dealQualifies: value.dealQualifiedIds.size,
      }))
  }, [passedClosingEvents, datedClosingEvents])

  const closingStatusData = useMemo(() => {
    const map = {}
    uniqueStatusEvents.forEach((l) => {
      const s = l.closing_status || 'Aucun statut'
      if (s !== 'Aucun statut') map[s] = (map[s] || 0) + 1
    })
    return getTop5WithOthers(Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value))
  }, [uniqueStatusEvents])

  const dealWonEvents = useMemo(
    () => dedupeEventsByLead(datedClosingEvents.filter((d) => isDealWonStatus(d.closing_status))),
    [datedClosingEvents]
  )
  const dealWonByCampaign = useMemo(
    () => getTop5WithOthers(aggregateBy(dealWonEvents, (l) => l.campaign_name)),
    [dealWonEvents]
  )
  const dealWonByPlatform = useMemo(
    () => getTop5WithOthers(aggregateBy(dealWonEvents, (l) => l.platform)),
    [dealWonEvents]
  )

  const campaignBarData = useMemo(
    () => aggregateBy(passedClosingEvents.filter((l) => isNoShowStatus(l.closing_status)), (l) => l.campaign_name)
      .map(({ name, value }) => ({ name, 'No Show': value })),
    [passedClosingEvents]
  )

  const tableData = useMemo(() => {
    const map = {}
    const row = (c) => (map[c] ||= {
      campaign: c, rdvIds: new Set(), noShowIds: new Set(), dealQualifiedIds: new Set(), dealWonIds: new Set(),
    })
    rdvStatuses.forEach((l) => row(l.campaign_name || 'N/A').rdvIds.add(l.lead_id))
    passedClosingEvents.forEach((l) => {
      if (isNoShowStatus(l.closing_status)) row(l.campaign_name || 'N/A').noShowIds.add(l.lead_id)
    })
    datedClosingEvents.forEach((l) => {
      if (!isDealQualifiedStatus(l.closing_status)) return
      const r = row(l.campaign_name || 'N/A')
      r.dealQualifiedIds.add(l.lead_id)
      if (isDealWonStatus(l.closing_status)) r.dealWonIds.add(l.lead_id)
    })
    return Object.values(map)
      .map((value) => ({
        campaign: value.campaign,
        totalRdv: value.rdvIds.size,
        noShow: value.noShowIds.size,
        dealQualifies: value.dealQualifiedIds.size,
        dealWon: value.dealWonIds.size,
      }))
      .sort((a, b) => b.dealWon - a.dealWon)
  }, [rdvStatuses, passedClosingEvents, datedClosingEvents])

  const funnelSteps = useMemo(() => [
    { label: 'Total RDV', count: total_rdv },
    { label: 'RDV Passés', count: rdv_passes },
    { label: 'Deal Qualifié', count: deal_qualifies },
    { label: 'Deal Won', count: deal_won },
  ], [total_rdv, rdv_passes, deal_qualifies, deal_won])

  const resetFilters = () => {
    setStartDate('')
    setEndDate('')
    setFilterPlatform('')
    setFilterCampaign('')
    setFilterSocial('')
  }

  const KpiCard = ({ icon: Icon, label, value, valueColor = '#ffffff', sub }) => (
    <div
      style={{
        background: '#111111',
        border: '1px solid #1f1f1f',
        borderRadius: '12px',
        padding: '16px',
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
      <p style={{ fontSize: '28px', fontWeight: 700, color: valueColor, margin: 0 }}>
        {value}
      </p>
      {sub && (
        <p style={{ color: '#888888', fontSize: '13px', marginTop: '8px' }}>{sub}</p>
      )}
    </div>
  )

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

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: '100%', overflowX: 'hidden', boxSizing: 'border-box' }}>

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
          <label style={{ color: '#888888', fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
            Date début
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              background: '#0a0a0a',
              border: '1px solid #1f1f1f',
              color: '#ffffff',
              colorScheme: 'dark',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>
        <div>
          <label style={{ color: '#888888', fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
            Date fin
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{
              background: '#0a0a0a',
              border: '1px solid #1f1f1f',
              color: '#ffffff',
              colorScheme: 'dark',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>
        <div>
          <label style={{ color: '#888888', fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
            Plateforme
          </label>
          <select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)} style={selectStyle}>
            <option value="">Toutes</option>
            {allPlatforms.map((p) => (<option key={p} value={p}>{p}</option>))}
          </select>
        </div>
        <div>
          <label style={{ color: '#888888', fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
            Campagne
          </label>
          <select value={filterCampaign} onChange={(e) => setFilterCampaign(e.target.value)} style={selectStyle}>
            <option value="">Toutes</option>
            {allCampaigns.map((c) => (<option key={c} value={c}>{c}</option>))}
          </select>
        </div>
        <div>
          <label style={{ color: '#888888', fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
            Réseau social
          </label>
          <select value={filterSocial} onChange={(e) => setFilterSocial(e.target.value)} style={selectStyle}>
            <option value="">Tous</option>
            {allSocials.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
        </div>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', width: '100%' }}>
        <KpiCard icon={Calendar} label="Total RDV" value={total_rdv} />
        <KpiCard icon={UserX} label="No Show" value={no_show} valueColor="#ff4444" />
        <KpiCard icon={Percent} label="Taux No Show" value={taux_no_show + '%'} valueColor="#ff4444" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', width: '100%' }}>
        <KpiCard icon={Briefcase} label="Deal Qualifiés" value={deal_qualifies} valueColor="#00D18B" />
        <KpiCard icon={Trophy} label="Deal Won" value={deal_won} valueColor="#00D18B" />
        <KpiCard icon={TrendingUp} label="Taux Deal Won" value={taux_deal_won + '%'} valueColor="#00D18B" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '65fr 35fr', gap: '16px', alignItems: 'stretch', width: '100%' }}>
        <div style={chartCardStyle}>
          <p style={{ color: '#ffffff', fontSize: '15px', fontWeight: 600, marginBottom: '20px' }}>
            Évolution No Show / Deal Qualifiés / Deal Won
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
              <XAxis dataKey="date" stroke="#888888" tick={{ fontSize: 12 }} />
              <YAxis stroke="#888888" tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend verticalAlign="top" align="right" wrapperStyle={{ color: '#888888', fontSize: '12px', paddingBottom: '12px' }} />
              <Line type="monotone" dataKey="noShow" stroke="#ff4444" strokeWidth={2} dot={{ fill: '#ff4444', r: 3 }} name="No Show" />
              <Line type="monotone" dataKey="dealQualifies" stroke="#00D18B" strokeWidth={2} dot={{ fill: '#00D18B', r: 3 }} name="Deal Qualifiés" />
              <Line type="monotone" dataKey="dealWon" stroke="#A78BFA" strokeWidth={2} dot={{ fill: '#A78BFA', r: 3 }} name="Deal Won" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div
          style={{
            background: '#111111',
            border: '1px solid #1f1f1f',
            borderRadius: '12px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <p style={{ color: '#ffffff', fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>
            Funnel Closing
          </p>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2px' }}>
            {funnelSteps.map((step, i) => {
              const maxCount = funnelSteps[0].count || 1
              const widthPercent = Math.min(100, (step.count / maxCount) * 100)
              const opacity = 1 - i * 0.1
              return (
                <div key={step.label}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 0' }}>
                    <span style={{ width: '100px', flexShrink: 0, color: '#888888', fontSize: '12px', textAlign: 'right' }}>
                      {step.label}
                    </span>
                    <div
                      style={{
                        height: '18px',
                        width: `${widthPercent}%`,
                        background: `rgba(0, 209, 139, ${opacity})`,
                        borderRadius: '4px',
                        minWidth: step.count > 0 ? '18px' : '0',
                      }}
                    />
                    <span style={{ color: '#ffffff', fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {step.count}
                    </span>
                    {i > 0 && (
                      <span style={{ color: '#888888', fontSize: '11px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {funnelSteps[i - 1].count > 0
                          ? ((step.count / funnelSteps[i - 1].count) * 100).toFixed(1)
                          : 0}%
                      </span>
                    )}
                  </div>
                  {i < funnelSteps.length - 1 && (
                    <div style={{ textAlign: 'center', color: '#444444', fontSize: '10px', lineHeight: 1 }}>▼</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        <div style={chartCardStyle}>
          <p style={{ color: '#ffffff', fontSize: '15px', fontWeight: 600, marginBottom: '20px' }}>
            Statuts Closing
          </p>
          <DonutWithLegend data={closingStatusData} />
        </div>
        <div style={chartCardStyle}>
          <p style={{ color: '#ffffff', fontSize: '15px', fontWeight: 600, marginBottom: '20px' }}>
            Deal Won par campagne
          </p>
          <DonutWithLegend data={dealWonByCampaign} />
        </div>
        <div style={chartCardStyle}>
          <p style={{ color: '#ffffff', fontSize: '15px', fontWeight: 600, marginBottom: '20px' }}>
            Deal Won par plateforme
          </p>
          <DonutWithLegend data={dealWonByPlatform} />
        </div>
      </div>

      <div style={chartCardStyle}>
        <p style={{ color: '#ffffff', fontSize: '15px', fontWeight: 600, marginBottom: '20px' }}>
          No Show par campagne
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={campaignBarData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
            <XAxis dataKey="name" stroke="#888888" tick={{ fontSize: 12 }} />
            <YAxis stroke="#888888" tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend verticalAlign="top" align="right" wrapperStyle={{ color: '#888888', fontSize: '12px', paddingBottom: '12px' }} />
            <Bar dataKey="No Show" fill="#ff4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={chartCardStyle}>
        <p style={{ color: '#ffffff', fontSize: '15px', fontWeight: 600, marginBottom: '20px' }}>
          Détail par campagne
        </p>
        <div style={{ overflowX: 'auto' }}>
        <Table>
          <TableHeader>
            <TableRow style={{ background: '#161616', borderBottom: '1px solid #1f1f1f' }}>
              <TableHead style={{ color: '#888888', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Campagne</TableHead>
              <TableHead style={{ color: '#888888', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total RDV</TableHead>
              <TableHead style={{ color: '#888888', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>No Show</TableHead>
              <TableHead style={{ color: '#888888', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deal Qualifiés</TableHead>
              <TableHead style={{ color: '#888888', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deal Won</TableHead>
              <TableHead style={{ color: '#888888', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Taux Closing</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData.map((row, i) => (
              <TableRow key={i} style={{ background: i % 2 === 0 ? '#111111' : '#0d0d0d', borderBottom: '1px solid #1f1f1f' }}>
                <TableCell style={{ color: '#ffffff', fontSize: '14px' }}>{row.campaign}</TableCell>
                <TableCell style={{ color: '#ffffff', fontSize: '14px', fontWeight: 600 }}>{row.totalRdv}</TableCell>
                <TableCell>
                  <span style={{ display: 'inline-block', background: '#ff444420', color: '#ff4444', borderRadius: '6px', padding: '3px 10px', fontSize: '12px', fontWeight: 500 }}>
                    {row.noShow}
                  </span>
                </TableCell>
                <TableCell>
                  <span style={{ display: 'inline-block', background: '#A78BFA20', color: '#A78BFA', borderRadius: '6px', padding: '3px 10px', fontSize: '12px', fontWeight: 500 }}>
                    {row.dealQualifies}
                  </span>
                </TableCell>
                <TableCell>
                  <span style={{ display: 'inline-block', background: '#00D18B20', color: '#00D18B', borderRadius: '6px', padding: '3px 10px', fontSize: '12px', fontWeight: 500 }}>
                    {row.dealWon}
                  </span>
                </TableCell>
                <TableCell style={{ color: '#ffffff', fontSize: '14px', fontWeight: 600 }}>
                  {row.totalRdv > 0 ? ((row.dealWon / row.totalRdv) * 100).toFixed(1) + '%' : '0.0%'}
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
