'use client'

import { useState, useMemo } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  countDistinctLeads,
  dedupeEventsByKey,
  dedupeEventsByLead,
  enrichEventsWithLeadSnapshots,
  filterEventsByDateRange,
  latestEventByLead,
  splitLeadEvents,
} from '@/lib/lead-events'
import {
  Calendar,
  UserCheck,
  UserX,
  Percent,
  Briefcase,
  Send,
  FileCheck,
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

  const filtered = useMemo(() => {
    let data = filterEventsByDateRange(enrichedClosingEvents, startDate, endDate)
    if (filterPlatform) data = data.filter((l) => l.platform === filterPlatform)
    if (filterCampaign) data = data.filter((l) => l.campaign_name === filterCampaign)
    if (filterSocial) data = data.filter((l) => l.social_network === filterSocial)
    return data
  }, [enrichedClosingEvents, startDate, endDate, filterPlatform, filterCampaign, filterSocial])

  const filteredSettingEvents = useMemo(() => {
    let data = filterEventsByDateRange(enrichedSettingEvents, startDate, endDate)
    if (filterPlatform) data = data.filter((l) => l.platform === filterPlatform)
    if (filterCampaign) data = data.filter((l) => l.campaign_name === filterCampaign)
    if (filterSocial) data = data.filter((l) => l.social_network === filterSocial)
    return data
  }, [enrichedSettingEvents, startDate, endDate, filterPlatform, filterCampaign, filterSocial])

  const firstQualificationByLead = useMemo(() => {
    const firstByLead = new Map()
    enrichedSettingEvents.forEach((event) => {
      if (!event.lead_id || event.setting_status !== 'Lead qualifié') return
      const timestamp = new Date(event.event_at).getTime()
      if (Number.isNaN(timestamp)) return
      const current = firstByLead.get(event.lead_id)
      if (current === undefined || timestamp < current) firstByLead.set(event.lead_id, timestamp)
    })
    return firstByLead
  }, [enrichedSettingEvents])
  const qualifiedClosingEvents = useMemo(
    () => filtered.filter((event) => {
      const qualificationTime = firstQualificationByLead.get(event.lead_id)
      const closingTime = new Date(event.event_at).getTime()
      return qualificationTime !== undefined && !Number.isNaN(closingTime) && closingTime > qualificationTime
    }),
    [filtered, firstQualificationByLead]
  )
  const total = countDistinctLeads(qualifiedClosingEvents)
  const uniqueStatusEvents = useMemo(
    () => dedupeEventsByKey(
      qualifiedClosingEvents,
      (event) => `${event.closing_status || ''}\u0000${event.lead_id}`
    ),
    [qualifiedClosingEvents]
  )
  const passedClosingEvents = useMemo(
    () => latestEventByLead(qualifiedClosingEvents),
    [qualifiedClosingEvents]
  )

  // Un RDV correspond à un lead qualifié par le Setting.
  const total_rdv = useMemo(
    () => countDistinctLeads(filteredSettingEvents, d => d.setting_status === 'Lead qualifié'),
    [filteredSettingEvents]
  )

  const no_show = useMemo(
    () => countDistinctLeads(passedClosingEvents, d => d.closing_status === 'No-Show'),
    [passedClosingEvents]
  )

  const rdv_passes = countDistinctLeads(passedClosingEvents)

  const show = countDistinctLeads(
    passedClosingEvents,
    d => d.closing_status !== null && d.closing_status !== '' && d.closing_status !== 'No-Show'
  )

  const taux_no_show = rdv_passes > 0
    ? (no_show / rdv_passes * 100).toFixed(1)
    : 0

  const taux_show = rdv_passes > 0
    ? (show / rdv_passes * 100).toFixed(1)
    : 0

  const rdv_en_cours = useMemo(
    () => countDistinctLeads(qualifiedClosingEvents, d => d.closing_status === 'Deal'),
    [qualifiedClosingEvents]
  )

  const deal_qualifies = useMemo(
    () => countDistinctLeads(qualifiedClosingEvents, d => d.closing_status === 'Deal Qualifié'),
    [qualifiedClosingEvents]
  )

  const proposal_sent = useMemo(
    () => countDistinctLeads(qualifiedClosingEvents, d => d.closing_status === 'Proposal Sent'),
    [qualifiedClosingEvents]
  )

  const proposal_signed = useMemo(
    () => countDistinctLeads(qualifiedClosingEvents, d => d.closing_status === 'Proposal Signed'),
    [qualifiedClosingEvents]
  )

  const deal_won = useMemo(
    () => countDistinctLeads(qualifiedClosingEvents, d => d.closing_status === 'Deal Won'),
    [qualifiedClosingEvents]
  )

  const deal_lost = useMemo(
    () => countDistinctLeads(qualifiedClosingEvents, d => d.closing_status === 'Deal Lost'),
    [qualifiedClosingEvents]
  )

  const taux_deal_qualifie = show > 0
    ? (deal_qualifies / show * 100).toFixed(1)
    : 0

  const taux_deal_won = show > 0
    ? (deal_won / show * 100).toFixed(1)
    : 0

  const dailyData = useMemo(() => {
    const days = {}
    passedClosingEvents.forEach((l) => {
      const d = l.event_at?.split('T')[0]
      if (d) {
        if (!days[d]) days[d] = { date: d, showIds: new Set(), noShowIds: new Set(), dealWonIds: new Set() }
        if (l.closing_status === 'No-Show') days[d].noShowIds.add(l.lead_id)
        else if (l.closing_status) days[d].showIds.add(l.lead_id)
      }
    })
    qualifiedClosingEvents.forEach((l) => {
      const d = l.event_at?.split('T')[0]
      if (!d || l.closing_status?.toLowerCase() !== 'deal won') return
      if (!days[d]) days[d] = { date: d, showIds: new Set(), noShowIds: new Set(), dealWonIds: new Set() }
      days[d].dealWonIds.add(l.lead_id)
    })
    return Object.entries(days)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => ({
        date: value.date,
        show: value.showIds.size,
        noShow: value.noShowIds.size,
        dealWon: value.dealWonIds.size,
      }))
  }, [passedClosingEvents, qualifiedClosingEvents])

  const showNoShowData = useMemo(() => {
    const data = [
      { name: 'Show', value: show },
      { name: 'No Show', value: no_show },
    ]
    return data.filter(d => d.value > 0)
  }, [show, no_show])

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

  const dealWonByCampaign = useMemo(
    () => getTop5WithOthers(aggregateBy(
      dedupeEventsByLead(qualifiedClosingEvents.filter((d) => d.closing_status?.toLowerCase() === 'deal won')),
      (l) => l.campaign_name
    )),
    [qualifiedClosingEvents]
  )
  const dealWonByPlatform = useMemo(
    () => getTop5WithOthers(aggregateBy(
      dedupeEventsByLead(qualifiedClosingEvents.filter((d) => d.closing_status?.toLowerCase() === 'deal won')),
      (l) => l.platform
    )),
    [qualifiedClosingEvents]
  )

  const campaignBarData = useMemo(() => {
    const map = {}
    passedClosingEvents.forEach((l) => {
      const c = l.campaign_name || 'N/A'
      if (!map[c]) map[c] = { name: c, showIds: new Set(), noShowIds: new Set() }
      if (l.closing_status === 'No-Show') map[c].noShowIds.add(l.lead_id)
      else if (l.closing_status) map[c].showIds.add(l.lead_id)
    })
    return Object.values(map)
      .map((value) => ({ name: value.name, Show: value.showIds.size, 'No Show': value.noShowIds.size }))
      .filter((d) => d.Show > 0 || d['No Show'] > 0)
  }, [passedClosingEvents])

  const tableData = useMemo(() => {
    const map = {}
    passedClosingEvents.forEach((l) => {
      const c = l.campaign_name || 'N/A'
      if (!map[c]) map[c] = {
        campaign: c,
        appointmentIds: new Set(),
        showIds: new Set(),
        noShowIds: new Set(),
        dealQualifiedIds: new Set(), dealWonIds: new Set(),
      }
      if (l.closing_status === 'No-Show') {
        map[c].noShowIds.add(l.lead_id)
      } else if (l.closing_status) {
        map[c].showIds.add(l.lead_id)
      }
    })
    qualifiedClosingEvents.forEach((l) => {
      const c = l.campaign_name || 'N/A'
      if (!map[c]) map[c] = {
        campaign: c, appointmentIds: new Set(), showIds: new Set(), noShowIds: new Set(),
        dealQualifiedIds: new Set(), dealWonIds: new Set(),
      }
      if (l.closing_status?.toLowerCase() === 'deal qualifié') map[c].dealQualifiedIds.add(l.lead_id)
      if (l.closing_status?.toLowerCase() === 'deal won') map[c].dealWonIds.add(l.lead_id)
    })
    filteredSettingEvents.forEach((l) => {
      if (l.setting_status !== 'Lead qualifié') return
      const c = l.campaign_name || 'N/A'
      if (!map[c]) map[c] = {
        campaign: c, appointmentIds: new Set(), showIds: new Set(), noShowIds: new Set(),
        dealQualifiedIds: new Set(), dealWonIds: new Set(),
      }
      map[c].appointmentIds.add(l.lead_id)
    })
    return Object.values(map)
      .map((value) => ({
        campaign: value.campaign,
        totalRdv: value.appointmentIds.size,
        show: value.showIds.size,
        noShow: value.noShowIds.size,
        dealQualifies: value.dealQualifiedIds.size,
        dealWon: value.dealWonIds.size,
      }))
      .sort((a, b) => b.dealWon - a.dealWon)
  }, [filteredSettingEvents, passedClosingEvents, qualifiedClosingEvents])

  const funnelSteps = useMemo(() => {
    const steps = [
      { label: 'Total Leads', count: total },
      { label: 'Total RDV', count: total_rdv },
      { label: 'RDV Passés', count: rdv_passes },
      { label: 'Show', count: show },
      { label: 'Deal Qualifié', count: deal_qualifies },
      { label: 'Proposal Sent', count: proposal_sent },
      { label: 'Proposal Signed', count: proposal_signed },
      { label: 'Deal Won', count: deal_won },
    ]
    return steps
  }, [total, total_rdv, rdv_passes, show, deal_qualifies, proposal_sent, proposal_signed, deal_won])

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
        <KpiCard icon={UserCheck} label="Show" value={show} valueColor="#00D18B" />
        <KpiCard icon={UserX} label="No Show" value={no_show} valueColor="#ff4444" />
        <KpiCard icon={Percent} label="Taux Show" value={taux_show + '%'} valueColor="#00D18B" />
        <KpiCard icon={Percent} label="Taux No Show" value={taux_no_show + '%'} valueColor="#ff4444" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', width: '100%' }}>
        <KpiCard icon={Briefcase} label="Deal Qualifiés" value={deal_qualifies} valueColor="#00D18B" />
        <KpiCard icon={Send} label="Proposal Sent" value={proposal_sent} valueColor="#0088FE" />
        <KpiCard icon={FileCheck} label="Proposal Signed" value={proposal_signed} valueColor="#A78BFA" />
        <KpiCard icon={Trophy} label="Deal Won" value={deal_won} valueColor="#00D18B" />
        <KpiCard icon={TrendingUp} label="Taux Deal Won" value={taux_deal_won + '%'} valueColor="#00D18B" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '65fr 35fr', gap: '16px', alignItems: 'stretch', width: '100%' }}>
        <div style={chartCardStyle}>
          <p style={{ color: '#ffffff', fontSize: '15px', fontWeight: 600, marginBottom: '20px' }}>
            Évolution Show / No Show / Deal Won
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
              <XAxis dataKey="date" stroke="#888888" tick={{ fontSize: 12 }} />
              <YAxis stroke="#888888" tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend verticalAlign="top" align="right" wrapperStyle={{ color: '#888888', fontSize: '12px', paddingBottom: '12px' }} />
              <Line type="monotone" dataKey="show" stroke="#00D18B" strokeWidth={2} dot={{ fill: '#00D18B', r: 3 }} name="Show" />
              <Line type="monotone" dataKey="noShow" stroke="#ff4444" strokeWidth={2} dot={{ fill: '#ff4444', r: 3 }} name="No Show" />
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
              const widthPercent = (step.count / maxCount) * 100
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
            Show / No Show
          </p>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie data={showNoShowData} dataKey="value" nameKey="name" cx="50%" cy="58%" innerRadius={30} outerRadius={70}
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
                {showNoShowData.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? '#00D18B' : '#ff4444'} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [value, name]} contentStyle={{ background: '#161616', border: '1px solid #2f2f2f', borderRadius: '8px', color: '#ffffff' }} />
              <Legend verticalAlign="top" align="left" layout="vertical" content={({ payload }) => {
                    const sorted = [...payload].sort((a, b) => {
                      if (a.value === 'Autres') return 1
                      if (b.value === 'Autres') return -1
                      return 0
                    })
                    return (
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {sorted.map((entry, i) => (
                          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: entry.color, display: 'inline-block', flexShrink: 0 }} />
                            <span style={{ color: '#ffffff', fontSize: '12px' }}>{entry.value}</span>
                          </li>
                        ))}
                      </ul>
                    )
                  }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={chartCardStyle}>
          <p style={{ color: '#ffffff', fontSize: '15px', fontWeight: 600, marginBottom: '20px' }}>
            Statuts Closing
          </p>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie data={closingStatusData} dataKey="value" nameKey="name" cx="50%" cy="58%" innerRadius={30} outerRadius={70}
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
                {closingStatusData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [value, name]} contentStyle={{ background: '#161616', border: '1px solid #2f2f2f', borderRadius: '8px', color: '#ffffff' }} />
              <Legend verticalAlign="top" align="left" layout="vertical" content={({ payload }) => {
                    const sorted = [...payload].sort((a, b) => {
                      if (a.value === 'Autres') return 1
                      if (b.value === 'Autres') return -1
                      return 0
                    })
                    return (
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {sorted.map((entry, i) => (
                          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: entry.color, display: 'inline-block', flexShrink: 0 }} />
                            <span style={{ color: '#ffffff', fontSize: '12px' }}>{entry.value}</span>
                          </li>
                        ))}
                      </ul>
                    )
                  }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={chartCardStyle}>
          <p style={{ color: '#ffffff', fontSize: '15px', fontWeight: 600, marginBottom: '20px' }}>
            Deal Won par campagne
          </p>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie data={dealWonByCampaign} dataKey="value" nameKey="name" cx="50%" cy="58%" innerRadius={30} outerRadius={70}
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
                {dealWonByCampaign.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [value, name]} contentStyle={{ background: '#161616', border: '1px solid #2f2f2f', borderRadius: '8px', color: '#ffffff' }} />
              <Legend verticalAlign="top" align="left" layout="vertical" content={({ payload }) => {
                    const sorted = [...payload].sort((a, b) => {
                      if (a.value === 'Autres') return 1
                      if (b.value === 'Autres') return -1
                      return 0
                    })
                    return (
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {sorted.map((entry, i) => (
                          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: entry.color, display: 'inline-block', flexShrink: 0 }} />
                            <span style={{ color: '#ffffff', fontSize: '12px' }}>{entry.value}</span>
                          </li>
                        ))}
                      </ul>
                    )
                  }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={chartCardStyle}>
          <p style={{ color: '#ffffff', fontSize: '15px', fontWeight: 600, marginBottom: '20px' }}>
            Deal Won par plateforme
          </p>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie data={dealWonByPlatform} dataKey="value" nameKey="name" cx="50%" cy="58%" innerRadius={30} outerRadius={70}
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
                {dealWonByPlatform.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [value, name]} contentStyle={{ background: '#161616', border: '1px solid #2f2f2f', borderRadius: '8px', color: '#ffffff' }} />
              <Legend verticalAlign="top" align="left" layout="vertical" content={({ payload }) => {
                    const sorted = [...payload].sort((a, b) => {
                      if (a.value === 'Autres') return 1
                      if (b.value === 'Autres') return -1
                      return 0
                    })
                    return (
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {sorted.map((entry, i) => (
                          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: entry.color, display: 'inline-block', flexShrink: 0 }} />
                            <span style={{ color: '#ffffff', fontSize: '12px' }}>{entry.value}</span>
                          </li>
                        ))}
                      </ul>
                    )
                  }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={chartCardStyle}>
        <p style={{ color: '#ffffff', fontSize: '15px', fontWeight: 600, marginBottom: '20px' }}>
          Show vs No Show par campagne
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={campaignBarData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
            <XAxis dataKey="name" stroke="#888888" tick={{ fontSize: 12 }} />
            <YAxis stroke="#888888" tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend verticalAlign="top" align="right" wrapperStyle={{ color: '#888888', fontSize: '12px', paddingBottom: '12px' }} />
            <Bar dataKey="Show" fill="#00D18B" radius={[4, 4, 0, 0]} />
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
              <TableHead style={{ color: '#888888', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Show</TableHead>
              <TableHead style={{ color: '#888888', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>No Show</TableHead>
              <TableHead style={{ color: '#888888', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Taux Show</TableHead>
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
                  <span style={{ display: 'inline-block', background: '#00D18B20', color: '#00D18B', borderRadius: '6px', padding: '3px 10px', fontSize: '12px', fontWeight: 500 }}>
                    {row.show}
                  </span>
                </TableCell>
                <TableCell>
                  <span style={{ display: 'inline-block', background: '#ff444420', color: '#ff4444', borderRadius: '6px', padding: '3px 10px', fontSize: '12px', fontWeight: 500 }}>
                    {row.noShow}
                  </span>
                </TableCell>
                <TableCell style={{ color: '#ffffff', fontSize: '14px', fontWeight: 600 }}>
                  {row.totalRdv > 0 ? ((row.show / row.totalRdv) * 100).toFixed(1) + '%' : '0.0%'}
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
