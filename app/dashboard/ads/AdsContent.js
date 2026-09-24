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
  Users,
  UserCheck,
  Calendar,
  Trophy,
  TrendingUp,
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
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
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

function filterEventDimensions(events, filters) {
  let data = filterEventsByDateRange(events, filters.startDate, filters.endDate)
  if (filters.platform) data = data.filter((event) => event.platform === filters.platform)
  if (filters.campaign) data = data.filter((event) => event.campaign_name === filters.campaign)
  if (filters.social) data = data.filter((event) => event.social_network === filters.social)
  return data
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

// Lien direct vers l'annonce dans Meta Ads Manager. On n'a pas l'ID du
// compte pub (act) ici — Meta redirige vers le bon compte si le viewer y a
// accès. Uniquement pour Meta : pas de format d'URL fiable pour les autres
// plateformes.
function getAdManagerUrl(row) {
  if (!row.ad_id || row.platform?.toLowerCase() !== 'meta') return null
  return `https://adsmanager.facebook.com/adsmanager/manage/ads?selected_ad_ids=${row.ad_id}`
}

function getTauxColor(val) {
  const num = parseFloat(val)
  if (num >= 30) return '#00D18B'
  if (num >= 15) return '#FFB347'
  return '#ff4444'
}

const FILTER_DEFAULTS = {
  startDate: '',
  endDate: '',
  platform: '',
  campaign: '',
  social: '',
}

export default function AdsContent({ leads }) {
  const [filters, setFilters] = useState({ ...FILTER_DEFAULTS })
  const [sortKey, setSortKey] = useState('total_leads')
  const [sortDir, setSortDir] = useState('desc')

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

  const setFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const resetFilters = () => {
    setFilters({ ...FILTER_DEFAULTS })
  }

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

  const filteredLeads = useMemo(
    () => dedupeEventsByLead(filterEventDimensions(leadCreatedEvents, filters)),
    [leadCreatedEvents, filters]
  )
  const filteredSettingEvents = useMemo(
    () => filterEventDimensions(enrichedSettingEvents, filters),
    [enrichedSettingEvents, filters]
  )
  const filteredClosingEvents = useMemo(
    () => filterEventDimensions(enrichedClosingEvents, filters),
    [enrichedClosingEvents, filters]
  )
  const filteredData = useMemo(
    () => [...filteredLeads, ...filteredSettingEvents, ...filteredClosingEvents],
    [filteredLeads, filteredSettingEvents, filteredClosingEvents]
  )
  const latestClosingEvents = useMemo(
    () => latestEventByLead(filteredClosingEvents),
    [filteredClosingEvents]
  )

  const totalLeads = useMemo(
    () => countDistinctLeads(filteredLeads),
    [filteredLeads]
  )
  const leadsQualifies = useMemo(
    () => countDistinctLeads(filteredSettingEvents, (l) => l.setting_status?.toLowerCase() === 'lead qualifié'),
    [filteredSettingEvents]
  )

  const no_show = useMemo(
    () => countDistinctLeads(latestClosingEvents, (d) => d.closing_status === 'No-Show'),
    [latestClosingEvents]
  )

  const rdv_passes = useMemo(
    () => countDistinctLeads(latestClosingEvents, (d) => Boolean(d.closing_status)),
    [latestClosingEvents]
  )

  const show = countDistinctLeads(
    latestClosingEvents,
    d => Boolean(d.closing_status) && d.closing_status !== 'No-Show'
  )

  const dealWon = useMemo(
    () => countDistinctLeads(filteredClosingEvents, (l) => l.closing_status?.toLowerCase() === 'deal won'),
    [filteredClosingEvents]
  )

  const tauxShow =
    rdv_passes > 0 ? ((show / rdv_passes) * 100).toFixed(1) + '%' : '0.0%'
  const tauxClosing =
    totalLeads > 0
      ? ((dealWon / totalLeads) * 100).toFixed(1) + '%'
      : '0.0%'

  const adStats = useMemo(() => {
    const latestClosingSet = new Set(latestClosingEvents)
    const raw = Object.values(
      filteredData.reduce((acc, d) => {
        const key = d.ad_name || 'No Ad'
        if (!acc[key]) {
          acc[key] = {
            ad_name: key,
            total_leads: 0,
            leads_qualifies: 0,
            nrp: 0,
            non_qualifies: 0,
            show: 0,
            no_show: 0,
            deal_qualifies: 0,
            proposal_sent: 0,
            proposal_signed: 0,
            deal_won: 0,
            campaign_name: d.campaign_name,
            adset_name: d.adset_name,
            platform: d.platform,
            social_network: d.social_network,
            ad_id: d.ad_id,
            leadIds: new Set(),
            qualifiedIds: new Set(),
            nrpIds: new Set(),
            nonQualifiedIds: new Set(),
            showIds: new Set(),
            noShowIds: new Set(),
            dealQualifiedIds: new Set(),
            proposalSentIds: new Set(),
            proposalSignedIds: new Set(),
            dealWonIds: new Set(),
          }
        }
        if (d.event_type === 'lead_created') acc[key].leadIds.add(d.lead_id)
        if (d.event_type === 'setting_updated' && d.setting_status?.toLowerCase() === 'lead qualifié') acc[key].qualifiedIds.add(d.lead_id)
        if (d.event_type === 'setting_updated' && d.setting_status?.toLowerCase() === 'nrp') acc[key].nrpIds.add(d.lead_id)
        if (d.event_type === 'setting_updated' && d.setting_status?.toLowerCase() === 'lead non qualifié') acc[key].nonQualifiedIds.add(d.lead_id)
        if (latestClosingSet.has(d) && d.closing_status && d.closing_status !== 'No-Show') acc[key].showIds.add(d.lead_id)
        if (latestClosingSet.has(d) && d.closing_status === 'No-Show') acc[key].noShowIds.add(d.lead_id)
        if (d.event_type === 'closing_updated' && d.closing_status?.toLowerCase() === 'deal qualifié') acc[key].dealQualifiedIds.add(d.lead_id)
        if (d.event_type === 'closing_updated' && d.closing_status?.toLowerCase() === 'proposal sent') acc[key].proposalSentIds.add(d.lead_id)
        if (d.event_type === 'closing_updated' && d.closing_status?.toLowerCase() === 'proposal signed') acc[key].proposalSignedIds.add(d.lead_id)
        if (d.event_type === 'closing_updated' && d.closing_status?.toLowerCase() === 'deal won') acc[key].dealWonIds.add(d.lead_id)
        return acc
      }, {})
    )
    raw.forEach((ad) => {
      ad.total_leads = ad.leadIds.size
      ad.leads_qualifies = ad.qualifiedIds.size
      ad.nrp = ad.nrpIds.size
      ad.non_qualifies = ad.nonQualifiedIds.size
      ad.show = ad.showIds.size
      ad.no_show = ad.noShowIds.size
      ad.deal_qualifies = ad.dealQualifiedIds.size
      ad.proposal_sent = ad.proposalSentIds.size
      ad.proposal_signed = ad.proposalSignedIds.size
      ad.deal_won = ad.dealWonIds.size
      ad.taux_qualification =
        ad.total_leads > 0
          ? (ad.leads_qualifies / ad.total_leads) * 100
          : 0
      ad.taux_show =
        ad.show + ad.no_show > 0
          ? (ad.show / (ad.show + ad.no_show)) * 100
          : 0
      ad.taux_deal_won = ad.show > 0 ? (ad.deal_won / ad.show) * 100 : 0
    })
    return raw.sort((a, b) => b.total_leads - a.total_leads).slice(0, 10)
  }, [filteredData, latestClosingEvents])

  const platformData = useMemo(
    () => getTop5WithOthers(aggregateBy(filteredLeads, (l) => l.platform)),
    [filteredLeads]
  )
  const socialData = useMemo(
    () => getTop5WithOthers(aggregateBy(filteredLeads, (l) => l.social_network)),
    [filteredLeads]
  )
  const qualifiesByCampaign = useMemo(
    () =>
      getTop5WithOthers(aggregateBy(
        dedupeEventsByLead(filteredSettingEvents.filter((d) => d.setting_status?.toLowerCase() === 'lead qualifié')),
        (l) => l.campaign_name
      )),
    [filteredSettingEvents]
  )
  const dealWonByCampaign = useMemo(
    () =>
      getTop5WithOthers(aggregateBy(
        dedupeEventsByLead(filteredClosingEvents.filter((d) => d.closing_status?.toLowerCase() === 'deal won')),
        (l) => l.campaign_name
      )),
    [filteredClosingEvents]
  )

  const dailyData = useMemo(() => {
    const days = {}
    filteredData.forEach((l) => {
      const d = l.event_at?.split('T')[0]
      if (d) {
        if (!days[d])
          days[d] = { date: d, leadIds: new Set(), qualifiedIds: new Set(), dealWonIds: new Set() }
        if (l.event_type === 'lead_created') days[d].leadIds.add(l.lead_id)
        if (l.event_type === 'setting_updated' && l.setting_status?.toLowerCase() === 'lead qualifié') days[d].qualifiedIds.add(l.lead_id)
        if (l.event_type === 'closing_updated' && l.closing_status?.toLowerCase() === 'deal won') days[d].dealWonIds.add(l.lead_id)
      }
    })
    return Object.entries(days)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => ({
        date: value.date,
        Total: value.leadIds.size,
        Qualifiés: value.qualifiedIds.size,
        'Deal Won': value.dealWonIds.size,
      }))
  }, [filteredData])

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sortedTableData = useMemo(() => {
    const sorted = [...adStats]
    sorted.sort((a, b) => {
      let aVal = a[sortKey]
      let bVal = b[sortKey]
      if (aVal == null) aVal = 0
      if (bVal == null) bVal = 0
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal
      }
      const aStr = String(aVal)
      const bStr = String(bVal)
      return sortDir === 'asc'
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr)
    })
    return sorted
  }, [adStats, sortKey, sortDir])

  const SortIcon = ({ active, dir }) =>
    active ? (
      <span style={{ color: '#00D18B', marginLeft: '4px' }}>
        {dir === 'asc' ? '▲' : '▼'}
      </span>
    ) : null

  const KpiCard = ({ icon: Icon, label, value, valueColor = '#ffffff' }) => (
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
          top: '16px',
          right: '16px',
          background: '#00D18B15',
          padding: '8px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={18} color="#00D18B" />
      </div>
      <p
        style={{
          color: '#888888',
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '8px',
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: '28px',
          fontWeight: 700,
          color: valueColor,
          margin: 0,
        }}
      >
        {value}
      </p>
    </div>
  )

  const SortableHeader = ({ label, sortKey: sk }) => (
    <TableHead
      onClick={() => handleSort(sk)}
      style={{
        color: '#888888',
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
    >
      {label}
      <SortIcon active={sortKey === sk} dir={sortDir} />
    </TableHead>
  )

  const renderMedal = (i) => {
    if (i === 0) return '🥇'
    if (i === 1) return '🥈'
    if (i === 2) return '🥉'
    return i + 1
  }

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
      {/* FILTRES */}
      <div
        style={{
          background: '#161616',
          border: '1px solid #1f1f1f',
          borderRadius: '12px',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div
          style={{
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
              value={filters.startDate}
              onChange={(e) => setFilter('startDate', e.target.value)}
              style={inputDateStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Date fin</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilter('endDate', e.target.value)}
              style={inputDateStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Plateforme</label>
            <select
              value={filters.platform}
              onChange={(e) => setFilter('platform', e.target.value)}
              style={selectStyle}
            >
              <option value="">Toutes</option>
              {allPlatforms.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Campagne</label>
            <select
              value={filters.campaign}
              onChange={(e) => setFilter('campaign', e.target.value)}
              style={selectStyle}
            >
              <option value="">Toutes</option>
              {allCampaigns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Réseau social</label>
            <select
              value={filters.social}
              onChange={(e) => setFilter('social', e.target.value)}
              style={selectStyle}
            >
              <option value="">Tous</option>
              {allSocials.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '20px',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
          }}
        >
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
      </div>

      {/* KPI CARDS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '16px',
          width: '100%',
        }}
      >
        <KpiCard icon={Users} label="Total Leads" value={totalLeads} />
        <KpiCard
          icon={UserCheck}
          label="Leads Qualifiés"
          value={leadsQualifies}
          valueColor="#00D18B"
        />
        <KpiCard
          icon={Calendar}
          label="Taux de Show"
          value={tauxShow}
          valueColor="#00D18B"
        />
        <KpiCard
          icon={Trophy}
          label="Deal Won"
          value={dealWon}
          valueColor="#00D18B"
        />
        <KpiCard
          icon={TrendingUp}
          label="Taux de Closing"
          value={tauxClosing}
          valueColor="#00D18B"
        />
      </div>

      {/* BARRES HORIZONTALES 50/50 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          width: '100%',
        }}
      >
        <div style={chartCardStyle}>
          <p
            style={{
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 600,
              marginBottom: '20px',
            }}
          >
            Top 10 Ads par leads
          </p>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={adStats} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
              <XAxis type="number" stroke="#888888" tick={{ fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="ad_name"
                stroke="#888888"
                tick={{ fontSize: 11 }}
                width={180}
                tickFormatter={(val) =>
                  val.length > 30 ? val.slice(0, 30) + '...' : val
                }
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{
                  color: '#888888',
                  fontSize: '12px',
                  paddingBottom: '12px',
                }}
              />
              <Bar
                dataKey="total_leads"
                fill="#00D18B"
                name="Total Leads"
                radius={[0, 4, 4, 0]}
              />
              <Bar
                dataKey="leads_qualifies"
                fill="#0088FE"
                name="Leads Qualifiés"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={chartCardStyle}>
          <p
            style={{
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 600,
              marginBottom: '20px',
            }}
          >
            Top 10 Ads par Deal Won
          </p>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={adStats} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
              <XAxis type="number" stroke="#888888" tick={{ fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="ad_name"
                stroke="#888888"
                tick={{ fontSize: 11 }}
                width={180}
                tickFormatter={(val) =>
                  val.length > 30 ? val.slice(0, 30) + '...' : val
                }
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{
                  color: '#888888',
                  fontSize: '12px',
                  paddingBottom: '12px',
                }}
              />
              <Bar
                dataKey="deal_won"
                fill="#A78BFA"
                name="Deal Won"
                radius={[0, 4, 4, 0]}
              />
              <Bar
                dataKey="proposal_sent"
                fill="#00D18B"
                name="Proposal Sent"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* DONUTS 2x2 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px',
        }}
      >
        {[
          { title: 'Leads par plateforme', data: platformData },
          { title: 'Leads par réseau social', data: socialData },
          { title: 'Leads qualifiés par campagne', data: qualifiesByCampaign },
          { title: 'Deal Won par campagne', data: dealWonByCampaign },
        ].map(({ title, data }) => {
          const sortedLegend = [...data].sort((a, b) => {
            if (a.name === 'Autres') return 1
            if (b.name === 'Autres') return -1
            return 0
          })
          return (
          <div key={title} style={chartCardStyle}>
            <p
              style={{
                color: '#ffffff',
                fontSize: '15px',
                fontWeight: 600,
                marginBottom: '20px',
              }}
            >
              {title}
            </p>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: '0 0 42%', minWidth: 0 }}>
                {sortedLegend.map((entry, i) => {
                  const colorIndex = data.findIndex((d) => d.name === entry.name)
                  return (
                    <li key={i} title={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', minWidth: 0 }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: DONUT_COLORS[colorIndex % DONUT_COLORS.length], display: 'inline-block', flexShrink: 0 }} />
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
                        <Cell
                          key={i}
                          fill={DONUT_COLORS[i % DONUT_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, name]} contentStyle={{ background: '#161616', border: '1px solid #2f2f2f', borderRadius: '8px', color: '#ffffff' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          )
        })}
      </div>

      {/* TABLEAU */}
      <div style={chartCardStyle}>
        <p
          style={{
            color: '#ffffff',
            fontSize: '15px',
            fontWeight: 600,
            marginBottom: '4px',
          }}
        >
          Performance des créatives — Top 10
        </p>
        <p
          style={{
            color: '#888888',
            fontSize: '12px',
            marginBottom: '20px',
          }}
        >
          Trié par nombre de leads décroissant
        </p>
        <div style={{ overflowX: 'auto' }}>
          <Table>
            <TableHeader>
              <TableRow
                style={{
                  background: '#161616',
                  borderBottom: '1px solid #1f1f1f',
                }}
              >
                <TableHead
                  style={{
                    color: '#888888',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    width: '40px',
                  }}
                >
                  #
                </TableHead>
                <SortableHeader label="Ad" sortKey="ad_name" />
                <SortableHeader label="Campagne" sortKey="campaign_name" />
                <SortableHeader label="Adset" sortKey="adset_name" />

                    <SortableHeader label="Total Leads" sortKey="total_leads" />
                    <SortableHeader
                      label="Leads Qualifiés"
                      sortKey="leads_qualifies"
                    />
                    <SortableHeader label="NRP" sortKey="nrp" />
                    <SortableHeader
                      label="Non Qualifiés"
                      sortKey="non_qualifies"
                    />
                    <SortableHeader
                      label="Taux Qualif"
                      sortKey="taux_qualification"
                    />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTableData.map((row, i) => {
                const adDisplay =
                  row.ad_name.length > 40
                    ? row.ad_name.slice(0, 40) + '...'
                    : row.ad_name
                const adUrl = getAdManagerUrl(row)
                return (
                  <TableRow
                    key={row.ad_name}
                    style={{
                      background: i % 2 === 0 ? '#111111' : '#0d0d0d',
                      borderBottom: '1px solid #1f1f1f',
                    }}
                  >
                    <TableCell
                      style={{
                        color: '#ffffff',
                        fontSize: '14px',
                        fontWeight: 600,
                        width: '40px',
                      }}
                    >
                      {renderMedal(i)}
                    </TableCell>
                    <TableCell
                      style={{ color: '#ffffff', fontSize: '13px' }}
                      title={row.ad_name}
                    >
                      {adUrl ? (
                        <a
                          href={adUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#00D18B', textDecoration: 'none' }}
                          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                        >
                          {adDisplay}
                        </a>
                      ) : (
                        adDisplay
                      )}
                    </TableCell>
                    <TableCell style={{ color: '#888888', fontSize: '13px' }}>
                      {row.campaign_name || '—'}
                    </TableCell>
                    <TableCell style={{ color: '#888888', fontSize: '13px' }}>
                      {row.adset_name || '—'}
                    </TableCell>

                        <TableCell style={{ color: '#ffffff', fontSize: '14px', fontWeight: 600 }}>
                          {row.total_leads}
                        </TableCell>
                        <TableCell>
                          <span
                            style={{
                              display: 'inline-block',
                              background: '#00D18B20',
                              color: '#00D18B',
                              borderRadius: '6px',
                              padding: '3px 10px',
                              fontSize: '12px',
                              fontWeight: 500,
                            }}
                          >
                            {row.leads_qualifies}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            style={{
                              display: 'inline-block',
                              background: '#FFB34720',
                              color: '#FFB347',
                              borderRadius: '6px',
                              padding: '3px 10px',
                              fontSize: '12px',
                              fontWeight: 500,
                            }}
                          >
                            {row.nrp}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            style={{
                              display: 'inline-block',
                              background: '#ff444420',
                              color: '#ff4444',
                              borderRadius: '6px',
                              padding: '3px 10px',
                              fontSize: '12px',
                              fontWeight: 500,
                            }}
                          >
                            {row.non_qualifies}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            style={{
                              display: 'inline-block',
                              background: `${getTauxColor(row.taux_qualification)}20`,
                              color: getTauxColor(row.taux_qualification),
                              borderRadius: '6px',
                              padding: '3px 10px',
                              fontSize: '12px',
                              fontWeight: 500,
                            }}
                          >
                            {row.taux_qualification.toFixed(1)}%
                          </span>
                        </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ÉVOLUTION */}
      <div style={chartCardStyle}>
        <p
          style={{
            color: '#ffffff',
            fontSize: '15px',
            fontWeight: 600,
            marginBottom: '20px',
          }}
        >
          Évolution dans le temps
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
            <XAxis
              dataKey="date"
              stroke="#888888"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              stroke="#888888"
              tick={{ fontSize: 12 }}
              allowDecimals={false}
            />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{
                color: '#888888',
                fontSize: '12px',
                paddingBottom: '12px',
              }}
            />
            <Area
              type="monotone"
              dataKey="Total"
              stroke="#00D18B"
              fill="#00D18B"
              fillOpacity={0.06}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="Total"
              stroke="#00D18B"
              strokeWidth={2}
              dot={{ fill: '#00D18B', r: 3 }}
              name="Total Leads"
            />
            <Line
              type="monotone"
              dataKey="Qualifiés"
              stroke="#0088FE"
              strokeWidth={2}
              dot={{ fill: '#0088FE', r: 3 }}
              name="Leads Qualifiés"
            />
            <Line
              type="monotone"
              dataKey="Deal Won"
              stroke="#A78BFA"
              strokeWidth={2}
              dot={{ fill: '#A78BFA', r: 3 }}
              name="Deal Won"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
