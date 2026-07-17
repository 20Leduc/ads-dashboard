'use client'

import { useState, useMemo } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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

function filterByDateRange(leads, start, end) {
  return leads.filter((l) => {
    if (start && l.event_at < start) return false
    if (end && l.event_at > end + 'T23:59:59') return false
    return true
  })
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
    let data = filterByDateRange(leads, startDate, endDate)
    if (filterPlatform) data = data.filter((l) => l.platform === filterPlatform)
    if (filterCampaign) data = data.filter((l) => l.campaign_name === filterCampaign)
    if (filterSocial) data = data.filter((l) => l.social_network === filterSocial)
    return data
  }, [leads, startDate, endDate, filterPlatform, filterCampaign, filterSocial])

  const total = filtered.length

  const leads_qualifies = useMemo(
    () => filtered.filter(d => d.setting_status === 'Lead qualifié'),
    [filtered]
  )

  const total_rdv = leads_qualifies.length

  const no_show = useMemo(
    () => filtered.filter(d => d.closing_status === 'No-Show').length,
    [filtered]
  )

  const rdv_passes = useMemo(() => filtered.filter(d =>
    (
      d.setting_status === 'Lead qualifié' &&
      ['Deal Qualifié', 'Deal Non Qualifié', 'Proposal Sent',
       'Proposal Signed', 'Deal Won', 'Deal Lost'].includes(d.closing_status)
    ) || (
      d.closing_status === 'No-Show'
    )
  ).length, [filtered])

  const show = rdv_passes - no_show

  const taux_no_show = rdv_passes > 0
    ? (no_show / rdv_passes * 100).toFixed(1)
    : 0

  const taux_show = rdv_passes > 0
    ? (show / rdv_passes * 100).toFixed(1)
    : 0

  const rdv_en_cours = useMemo(
    () => leads_qualifies.filter(d => d.closing_status === 'Deal').length,
    [leads_qualifies]
  )

  const deal_qualifies = useMemo(
    () => leads_qualifies.filter(d => d.closing_status === 'Deal Qualifié').length,
    [leads_qualifies]
  )

  const proposal_sent = useMemo(
    () => leads_qualifies.filter(d => d.closing_status === 'Proposal Sent').length,
    [leads_qualifies]
  )

  const proposal_signed = useMemo(
    () => leads_qualifies.filter(d => d.closing_status === 'Proposal Signed').length,
    [leads_qualifies]
  )

  const deal_won = useMemo(
    () => leads_qualifies.filter(d => d.closing_status === 'Deal Won').length,
    [leads_qualifies]
  )

  const deal_lost = useMemo(
    () => leads_qualifies.filter(d => d.closing_status === 'Deal Lost').length,
    [leads_qualifies]
  )

  const taux_deal_qualifie = show > 0
    ? (deal_qualifies / show * 100).toFixed(1)
    : 0

  const taux_deal_won = show > 0
    ? (deal_won / show * 100).toFixed(1)
    : 0

  const dailyData = useMemo(() => {
    const days = {}
    filtered.forEach((l) => {
      const d = l.event_at?.split('T')[0]
      if (d) {
        if (!days[d]) days[d] = { date: d, show: 0, noShow: 0, dealWon: 0 }
        if (l.closing_status === 'No-Show') days[d].noShow++
        else if (
          l.setting_status === 'Lead qualifié' &&
          ['Deal Qualifié', 'Deal Non Qualifié', 'Proposal Sent',
           'Proposal Signed', 'Deal Won', 'Deal Lost'].includes(l.closing_status)
        ) days[d].show++
        if (l.closing_status?.toLowerCase() === 'deal won') days[d].dealWon++
      }
    })
    return Object.entries(days)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v)
  }, [filtered])

  const showNoShowData = useMemo(() => {
    const data = [
      { name: 'Show', value: show },
      { name: 'No Show', value: no_show },
    ]
    return data.filter(d => d.value > 0)
  }, [show, no_show])

  const closingStatusData = useMemo(() => {
    const map = {}
    filtered.forEach((l) => {
      const s = l.closing_status || 'Aucun statut'
      if (s !== 'Aucun statut') map[s] = (map[s] || 0) + 1
    })
    return getTop5WithOthers(Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value))
  }, [filtered])

  const dealWonByCampaign = useMemo(
    () => getTop5WithOthers(aggregateBy(
      filtered.filter((d) => d.closing_status?.toLowerCase() === 'deal won'),
      (l) => l.campaign_name
    )),
    [filtered]
  )
  const dealWonByPlatform = useMemo(
    () => getTop5WithOthers(aggregateBy(
      filtered.filter((d) => d.closing_status?.toLowerCase() === 'deal won'),
      (l) => l.platform
    )),
    [filtered]
  )

  const campaignBarData = useMemo(() => {
    const map = {}
    filtered.forEach((l) => {
      const c = l.campaign_name || 'N/A'
      if (!map[c]) map[c] = { name: c, Show: 0, 'No Show': 0 }
      if (l.closing_status === 'No-Show') map[c]['No Show']++
      else if (
        l.setting_status === 'Lead qualifié' &&
        ['Deal Qualifié', 'Deal Non Qualifié', 'Proposal Sent',
         'Proposal Signed', 'Deal Won', 'Deal Lost'].includes(l.closing_status)
      ) map[c].Show++
    })
    return Object.values(map).filter((d) => d.Show > 0 || d['No Show'] > 0)
  }, [filtered])

  const tableData = useMemo(() => {
    const map = {}
    filtered.forEach((l) => {
      const c = l.campaign_name || 'N/A'
      if (!map[c]) map[c] = { campaign: c, totalRdv: 0, show: 0, noShow: 0, dealQualifies: 0, dealWon: 0 }
      if (l.closing_status === 'No-Show') {
        map[c].noShow++
        map[c].totalRdv++
      } else if (
        l.setting_status === 'Lead qualifié' &&
        ['Deal Qualifié', 'Deal Non Qualifié', 'Proposal Sent',
         'Proposal Signed', 'Deal Won', 'Deal Lost'].includes(l.closing_status)
      ) {
        map[c].show++
        map[c].totalRdv++
      }
      if (l.closing_status?.toLowerCase() === 'deal qualifié') map[c].dealQualifies++
      if (l.closing_status?.toLowerCase() === 'deal won') map[c].dealWon++
    })
    return Object.values(map).sort((a, b) => b.dealWon - a.dealWon)
  }, [filtered])

  const funnelSteps = useMemo(() => {
    const steps = [
      { label: 'Total Leads', count: total },
      { label: 'Total RDV', count: total_rdv },
      { label: 'RDV Passés', count: rdv_passes },
      { label: 'Show', count: show },
      { label: 'No Show', count: no_show },
      { label: 'Deal Qualifié', count: deal_qualifies },
      { label: 'Proposal Sent', count: proposal_sent },
      { label: 'Proposal Signed', count: proposal_signed },
      { label: 'Deal Won', count: deal_won },
    ]
    return steps
  }, [total, total_rdv, rdv_passes, show, no_show, deal_qualifies, proposal_sent, proposal_signed, deal_won])

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
