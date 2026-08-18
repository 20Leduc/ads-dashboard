'use client'

import { useState, useMemo } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  countDistinctLeads,
  dedupeEventsByKey,
  dedupeEventsByLead,
  enrichEventsWithLeadSnapshots,
  filterEventsByDateRange,
  splitLeadEvents,
} from '@/lib/lead-events'
import {
  Users,
  UserCheck,
  UserX,
  UserMinus,
  Percent,
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
} from 'recharts'

const DONUT_COLORS = ['#00D18B', '#0088FE', '#FF6B6B', '#FFB347', '#A78BFA', '#888888']

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

export default function SettingContent({ leads }) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('')
  const [filterCampaign, setFilterCampaign] = useState('')
  const [filterSocial, setFilterSocial] = useState('')

  const { leadCreatedEvents, settingEvents } = useMemo(
    () => splitLeadEvents(leads),
    [leads]
  )
  const enrichedSettingEvents = useMemo(
    () => enrichEventsWithLeadSnapshots(settingEvents, leadCreatedEvents),
    [settingEvents, leadCreatedEvents]
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
    let data = filterEventsByDateRange(enrichedSettingEvents, startDate, endDate)
    if (filterPlatform) data = data.filter((l) => l.platform === filterPlatform)
    if (filterCampaign) data = data.filter((l) => l.campaign_name === filterCampaign)
    if (filterSocial) data = data.filter((l) => l.social_network === filterSocial)
    return data
  }, [enrichedSettingEvents, startDate, endDate, filterPlatform, filterCampaign, filterSocial])

  const total = countDistinctLeads(filtered)
  const uniqueStatusEvents = useMemo(
    () => dedupeEventsByKey(
      filtered,
      (event) => `${event.setting_status || ''}\u0000${event.lead_id}`
    ),
    [filtered]
  )

  const leadsQualifies = useMemo(
    () => countDistinctLeads(filtered, (l) => l.setting_status?.toLowerCase() === 'lead qualifié'),
    [filtered]
  )
  const leadsNonQualifies = useMemo(
    () => countDistinctLeads(filtered, (l) => l.setting_status?.toLowerCase() === 'lead non qualifié'),
    [filtered]
  )
  const leadsNrp = useMemo(
    () => countDistinctLeads(filtered, (l) => l.setting_status?.toLowerCase() === 'nrp'),
    [filtered]
  )
  const leadsEnAttente = useMemo(
    () => countDistinctLeads(filtered, (l) => !l.setting_status || l.setting_status === ''),
    [filtered]
  )

  const tauxQualification = total > 0
    ? ((leadsQualifies / total) * 100).toFixed(1) + '%'
    : '0.0%'

  const statusData = useMemo(() => {
    const map = {}
    uniqueStatusEvents.forEach((l) => {
      const s = l.setting_status || 'En attente'
      map[s] = (map[s] || 0) + 1
    })
    return getTop5WithOthers(
      Object.entries(map)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
    )
  }, [uniqueStatusEvents])

  const qualifiesByCampaign = useMemo(
    () => getTop5WithOthers(aggregateBy(
      dedupeEventsByLead(filtered.filter((l) => l.setting_status?.toLowerCase() === 'lead qualifié')),
      (l) => l.campaign_name
    )),
    [filtered]
  )
  const qualifiesByPlatform = useMemo(
    () => getTop5WithOthers(aggregateBy(
      dedupeEventsByLead(filtered.filter((l) => l.setting_status?.toLowerCase() === 'lead qualifié')),
      (l) => l.platform
    )),
    [filtered]
  )
  const qualifiesBySocial = useMemo(
    () => getTop5WithOthers(aggregateBy(
      dedupeEventsByLead(filtered.filter((l) => l.setting_status?.toLowerCase() === 'lead qualifié')),
      (l) => l.social_network
    )),
    [filtered]
  )

  const dailyData = useMemo(() => {
    const days = {}
    dedupeEventsByKey(
      filtered,
      (event) => `${event.event_at?.split('T')[0] || ''}\u0000${event.setting_status || ''}\u0000${event.lead_id}`
    ).forEach((l) => {
      const d = l.event_at?.split('T')[0]
      if (d) {
        if (!days[d]) days[d] = { date: d, qualifies: 0, nonQualifies: 0, nrp: 0 }
        if (l.setting_status?.toLowerCase() === 'lead qualifié') days[d].qualifies++
        else if (l.setting_status?.toLowerCase() === 'lead non qualifié') days[d].nonQualifies++
        else if (l.setting_status?.toLowerCase() === 'nrp') days[d].nrp++
      }
    })
    return Object.entries(days)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v)
  }, [filtered])

  const tableData = useMemo(() => {
    const map = {}
    dedupeEventsByKey(
      filtered,
      (event) => `${event.campaign_name || 'N/A'}\u0000${event.setting_status || ''}\u0000${event.lead_id}`
    ).forEach((l) => {
      const c = l.campaign_name || 'N/A'
      if (!map[c]) map[c] = { campaign: c, total: 0, qualifies: 0, nonQualifies: 0, nrp: 0 }
      map[c].total++
      if (l.setting_status?.toLowerCase() === 'lead qualifié') map[c].qualifies++
      else if (l.setting_status?.toLowerCase() === 'lead non qualifié') map[c].nonQualifies++
      else if (l.setting_status?.toLowerCase() === 'nrp') map[c].nrp++
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [filtered])

  const funnelSteps = useMemo(() => {
    const steps = [
      { label: 'Total Leads', count: total },
      { label: 'Leads Qualifiés', count: leadsQualifies },
      { label: 'NRP', count: leadsNrp },
      { label: 'Non Qualifiés', count: leadsNonQualifies },
    ]
    return steps
  }, [total, leadsQualifies, leadsNrp, leadsNonQualifies])

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
      <p style={{ fontSize: '32px', fontWeight: 700, color: valueColor, margin: 0 }}>
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
          <select
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            style={selectStyle}
          >
            <option value="">Toutes</option>
            {allPlatforms.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ color: '#888888', fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
            Campagne
          </label>
          <select
            value={filterCampaign}
            onChange={(e) => setFilterCampaign(e.target.value)}
            style={selectStyle}
          >
            <option value="">Toutes</option>
            {allCampaigns.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ color: '#888888', fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
            Réseau social
          </label>
          <select
            value={filterSocial}
            onChange={(e) => setFilterSocial(e.target.value)}
            style={selectStyle}
          >
            <option value="">Tous</option>
            {allSocials.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
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
        <KpiCard icon={Users} label="Total Leads" value={total} />
        <KpiCard icon={UserCheck} label="Leads Qualifiés" value={leadsQualifies} valueColor="#00D18B" />
        <KpiCard icon={UserX} label="Non Qualifiés" value={leadsNonQualifies} valueColor="#ff4444" />
        <KpiCard icon={UserMinus} label="NRP" value={leadsNrp} valueColor="#FFB347" />
        <KpiCard icon={Percent} label="Taux Qualif" value={tauxQualification} valueColor="#00D18B" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '65fr 35fr', gap: '16px', alignItems: 'stretch', width: '100%' }}>
        <div style={chartCardStyle}>
          <p style={{ color: '#ffffff', fontSize: '15px', fontWeight: 600, marginBottom: '20px' }}>
            Évolution des statuts setting
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
              <XAxis dataKey="date" stroke="#888888" tick={{ fontSize: 12 }} />
              <YAxis stroke="#888888" tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend verticalAlign="top" align="right" wrapperStyle={{ color: '#888888', fontSize: '12px', paddingBottom: '12px' }} />
              <Line type="monotone" dataKey="qualifies" stroke="#00D18B" strokeWidth={2} dot={{ fill: '#00D18B', r: 3 }} name="Qualifiés" />
              <Line type="monotone" dataKey="nonQualifies" stroke="#ff4444" strokeWidth={2} dot={{ fill: '#ff4444', r: 3 }} name="Non Qualifiés" />
              <Line type="monotone" dataKey="nrp" stroke="#FFB347" strokeWidth={2} dot={{ fill: '#FFB347', r: 3 }} name="NRP" />
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
            Funnel Setting
          </p>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2px' }}>
            {funnelSteps.map((step, i) => {
              const maxCount = funnelSteps[0].count || 1
              const widthPercent = (step.count / maxCount) * 100
              const opacity = 1 - i * 0.15
              return (
                <div key={step.label}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0' }}>
                    <span style={{ width: '120px', flexShrink: 0, color: '#888888', fontSize: '13px', textAlign: 'right' }}>
                      {step.label}
                    </span>
                    <div
                      style={{
                        height: '18px',
                        width: `${widthPercent}%`,
                        background: `rgba(0, 209, 139, ${opacity})`,
                        borderRadius: '4px',
                        transition: 'width 0.3s',
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
            Répartition par statut
          </p>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="58%"
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
                {statusData.map((_, i) => (
                  <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
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
            Qualifiés par campagne
          </p>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={qualifiesByCampaign}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="58%"
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
                {qualifiesByCampaign.map((_, i) => (
                  <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
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
            Qualifiés par plateforme
          </p>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={qualifiesByPlatform}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="58%"
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
                {qualifiesByPlatform.map((_, i) => (
                  <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
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
            Qualifiés par réseau social
          </p>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={qualifiesBySocial}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="58%"
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
                {qualifiesBySocial.map((_, i) => (
                  <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
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
                Total
              </TableHead>
              <TableHead style={{ color: '#888888', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Qualifiés
              </TableHead>
              <TableHead style={{ color: '#888888', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Non Qualifiés
              </TableHead>
              <TableHead style={{ color: '#888888', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                NRP
              </TableHead>
              <TableHead style={{ color: '#888888', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Taux Qualif
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData.map((row, i) => (
              <TableRow
                key={i}
                style={{
                  background: i % 2 === 0 ? '#111111' : '#0d0d0d',
                  borderBottom: '1px solid #1f1f1f',
                }}
              >
                <TableCell style={{ color: '#ffffff', fontSize: '14px' }}>{row.campaign}</TableCell>
                <TableCell style={{ color: '#ffffff', fontSize: '14px', fontWeight: 600 }}>{row.total}</TableCell>
                <TableCell>
                  <span style={{ display: 'inline-block', background: '#00D18B20', color: '#00D18B', borderRadius: '6px', padding: '3px 10px', fontSize: '12px', fontWeight: 500 }}>
                    {row.qualifies}
                  </span>
                </TableCell>
                <TableCell>
                  <span style={{ display: 'inline-block', background: '#ff444420', color: '#ff4444', borderRadius: '6px', padding: '3px 10px', fontSize: '12px', fontWeight: 500 }}>
                    {row.nonQualifies}
                  </span>
                </TableCell>
                <TableCell>
                  <span style={{ display: 'inline-block', background: '#FFB34720', color: '#FFB347', borderRadius: '6px', padding: '3px 10px', fontSize: '12px', fontWeight: 500 }}>
                    {row.nrp}
                  </span>
                </TableCell>
                <TableCell style={{ color: '#ffffff', fontSize: '14px', fontWeight: 600 }}>
                  {row.total > 0 ? ((row.qualifies / row.total) * 100).toFixed(1) + '%' : '0.0%'}
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
