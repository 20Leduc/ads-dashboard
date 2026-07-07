'use client'

import { useState, useMemo } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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

const DONUT_COLORS = [
  '#00D18B', '#0088FE', '#FF6B6B', '#FFB347',
  '#A78BFA', '#38BDF8', '#FB923C',
]

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
  pipeline: '',
  statut: '',
}

export default function AdsContent({ leads }) {
  const [input, setInput] = useState({ ...FILTER_DEFAULTS })
  const [applied, setApplied] = useState({ ...FILTER_DEFAULTS })
  const [sortKey, setSortKey] = useState('total_leads')
  const [sortDir, setSortDir] = useState('desc')

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

  const statutOptions = useMemo(() => {
    if (input.pipeline === 'Setting') {
      return ['Lead Qualifié', 'Lead Non qualifié', 'NRP']
    }
    if (input.pipeline === 'Closing') {
      return ['Deal Qualifié', 'Proposal Sent', 'Proposal Signed', 'Deal Won', 'Deal Lost']
    }
    return []
  }, [input.pipeline])

  const filteredData = useMemo(() => {
    let data = filterByDateRange(leads, applied.startDate, applied.endDate)
    if (applied.platform) data = data.filter((l) => l.platform === applied.platform)
    if (applied.campaign) data = data.filter((l) => l.campaign_name === applied.campaign)
    if (applied.social) data = data.filter((l) => l.social_network === applied.social)
    if (applied.pipeline === 'Setting' && applied.statut) {
      data = data.filter((l) => l.setting_status === applied.statut)
    }
    if (applied.pipeline === 'Closing' && applied.statut) {
      data = data.filter((l) => l.closing_status === applied.statut)
    }
    return data
  }, [leads, applied])

  const totalLeads = useMemo(
    () => filteredData.filter((l) => l.event_type === 'lead_created').length,
    [filteredData]
  )
  const leadsQualifies = useMemo(
    () => filteredData.filter((l) => l.setting_status === 'Lead Qualifié').length,
    [filteredData]
  )
  const show = useMemo(
    () => filteredData.filter((l) => l.show_no_show === 'Show').length,
    [filteredData]
  )
  const noShow = useMemo(
    () => filteredData.filter((l) => l.show_no_show === 'No Show').length,
    [filteredData]
  )
  const dealWon = useMemo(
    () => filteredData.filter((l) => l.closing_status === 'Deal Won').length,
    [filteredData]
  )

  const totalRdv = show + noShow
  const tauxShow =
    totalRdv > 0 ? ((show / totalRdv) * 100).toFixed(1) + '%' : '0.0%'
  const tauxClosing =
    totalLeads > 0
      ? ((dealWon / totalLeads) * 100).toFixed(1) + '%'
      : '0.0%'

  const adStats = useMemo(() => {
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
          }
        }
        acc[key].total_leads++
        if (d.setting_status === 'Lead Qualifié') acc[key].leads_qualifies++
        if (d.setting_status === 'NRP') acc[key].nrp++
        if (d.setting_status === 'Lead Non qualifié') acc[key].non_qualifies++
        if (d.show_no_show === 'Show') acc[key].show++
        if (d.show_no_show === 'No Show') acc[key].no_show++
        if (d.closing_status === 'Deal Qualifié') acc[key].deal_qualifies++
        if (d.closing_status === 'Proposal Sent') acc[key].proposal_sent++
        if (d.closing_status === 'Proposal Signed') acc[key].proposal_signed++
        if (d.closing_status === 'Deal Won') acc[key].deal_won++
        return acc
      }, {})
    )
    raw.forEach((ad) => {
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
  }, [filteredData])

  const platformData = useMemo(
    () => aggregateBy(filteredData, (l) => l.platform),
    [filteredData]
  )
  const socialData = useMemo(
    () => aggregateBy(filteredData, (l) => l.social_network),
    [filteredData]
  )
  const qualifiesByCampaign = useMemo(
    () =>
      aggregateBy(
        filteredData.filter((d) => d.setting_status === 'Lead Qualifié'),
        (l) => l.campaign_name
      ),
    [filteredData]
  )
  const dealWonByCampaign = useMemo(
    () =>
      aggregateBy(
        filteredData.filter((d) => d.closing_status === 'Deal Won'),
        (l) => l.campaign_name
      ),
    [filteredData]
  )

  const dailyData = useMemo(() => {
    const days = {}
    filteredData.forEach((l) => {
      const d = l.event_at?.split('T')[0]
      if (d) {
        if (!days[d])
          days[d] = { date: d, Total: 0, Qualifiés: 0, 'Deal Won': 0 }
        if (l.event_type === 'lead_created') days[d].Total++
        if (l.setting_status === 'Lead Qualifié') days[d].Qualifiés++
        if (l.closing_status === 'Deal Won') days[d]['Deal Won']++
      }
    })
    return Object.entries(days)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v)
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
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Campagne</label>
            <select
              value={input.campaign}
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
              value={input.social}
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
          <div>
            <label style={labelStyle}>Pipeline</label>
            <select
              value={input.pipeline}
              onChange={(e) => {
                setFilter('pipeline', e.target.value)
                setFilter('statut', '')
              }}
              style={selectStyle}
            >
              <option value="">Tous</option>
              <option value="Setting">Setting</option>
              <option value="Closing">Closing</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Statut</label>
            <select
              value={input.statut}
              onChange={(e) => setFilter('statut', e.target.value)}
              style={{
                ...selectStyle,
                opacity: !input.pipeline ? 0.5 : 1,
              }}
              disabled={!input.pipeline}
            >
              <option value="">Tous</option>
              {statutOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
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
        ].map(({ title, data }) => (
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
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="58%"
                  outerRadius={70}
                  label={({ name, percent }) =>
                    `${(percent * 100).toFixed(0)}%`
                  }
                >
                  {data.map((_, i) => (
                    <Cell
                      key={i}
                      fill={DONUT_COLORS[i % DONUT_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{
                    color: '#888888',
                    fontSize: '11px',
                    paddingBottom: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ))}
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

                {applied.pipeline === 'Closing' ? (
                  <>
                    <SortableHeader label="Show" sortKey="show" />
                    <SortableHeader label="No Show" sortKey="no_show" />
                    <SortableHeader label="Taux Show" sortKey="taux_show" />
                    <SortableHeader
                      label="Deal Qualifiés"
                      sortKey="deal_qualifies"
                    />
                    <SortableHeader
                      label="Proposal Sent"
                      sortKey="proposal_sent"
                    />
                    <SortableHeader label="Deal Won" sortKey="deal_won" />
                    <SortableHeader
                      label="Taux Closing"
                      sortKey="taux_deal_won"
                    />
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTableData.map((row, i) => {
                const mode = applied.pipeline === 'Closing' ? 'closing' : 'setting'
                const adDisplay =
                  row.ad_name.length > 40
                    ? row.ad_name.slice(0, 40) + '...'
                    : row.ad_name
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
                      {adDisplay}
                    </TableCell>
                    <TableCell style={{ color: '#888888', fontSize: '13px' }}>
                      {row.campaign_name || '—'}
                    </TableCell>
                    <TableCell style={{ color: '#888888', fontSize: '13px' }}>
                      {row.adset_name || '—'}
                    </TableCell>

                    {mode === 'closing' ? (
                      <>
                        <TableCell style={{ color: '#ffffff', fontSize: '14px', fontWeight: 600 }}>
                          {row.show}
                        </TableCell>
                        <TableCell style={{ color: '#ffffff', fontSize: '14px', fontWeight: 600 }}>
                          {row.no_show}
                        </TableCell>
                        <TableCell>
                          <span
                            style={{
                              display: 'inline-block',
                              background: `${getTauxColor(row.taux_show)}20`,
                              color: getTauxColor(row.taux_show),
                              borderRadius: '6px',
                              padding: '3px 10px',
                              fontSize: '12px',
                              fontWeight: 500,
                            }}
                          >
                            {row.taux_show.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            style={{
                              display: 'inline-block',
                              background: '#A78BFA20',
                              color: '#A78BFA',
                              borderRadius: '6px',
                              padding: '3px 10px',
                              fontSize: '12px',
                              fontWeight: 500,
                            }}
                          >
                            {row.deal_qualifies}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            style={{
                              display: 'inline-block',
                              background: '#0088FE20',
                              color: '#0088FE',
                              borderRadius: '6px',
                              padding: '3px 10px',
                              fontSize: '12px',
                              fontWeight: 500,
                            }}
                          >
                            {row.proposal_sent}
                          </span>
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
                            {row.deal_won}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            style={{
                              display: 'inline-block',
                              background: `${getTauxColor(row.taux_deal_won)}20`,
                              color: getTauxColor(row.taux_deal_won),
                              borderRadius: '6px',
                              padding: '3px 10px',
                              fontSize: '12px',
                              fontWeight: 500,
                            }}
                          >
                            {row.taux_deal_won.toFixed(1)}%
                          </span>
                        </TableCell>
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
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
