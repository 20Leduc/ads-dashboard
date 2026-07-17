'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Users, PenTool, TrendingUp } from 'lucide-react'
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
  BarChart,
  Bar,
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

function filterByDateRange(leads, start, end) {
  return leads.filter((l) => {
    if (start && l.event_at < start) return false
    if (end && l.event_at > end + 'T23:59:59') return false
    return true
  })
}

const cardStyle = { background: '#111111', border: '1px solid #1f1f1f' }
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

export default function LeadsContent({ leads }) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const filtered = useMemo(
    () => filterByDateRange(leads, startDate, endDate),
    [leads, startDate, endDate]
  )

  const totalLeads = useMemo(
    () => filtered.filter((l) => l.event_type === 'lead_created').length,
    [filtered]
  )

  const activeCreatives = useMemo(
    () => new Set(filtered.filter((l) => l.ad_name).map((l) => l.ad_name)).size,
    [filtered]
  )

  const funnelData = useMemo(() => {
    const steps = [
      { label: 'Leads', key: 'lead_created', type: 'event' },
      { label: 'Lead Qualifié', key: 'Lead Qualifié', type: 'setting' },
      { label: 'Deal Qualifié', key: 'Deal Qualifié', type: 'closing' },
      { label: 'Proposal Sent', key: 'Proposal Sent', type: 'closing' },
      { label: 'Proposal Signed', key: 'Proposal Signed', type: 'closing' },
      { label: 'Deal Won', key: 'Deal Won', type: 'closing' },
    ]
    let prev = 0
    return steps.map((step, i) => {
      let count
      if (step.type === 'event') {
        count = filtered.filter((l) => l.event_type === step.key).length
      } else if (step.type === 'setting') {
        count = filtered.filter((l) => l.setting_status?.toLowerCase() === step.key.toLowerCase()).length
      } else {
        count = filtered.filter((l) => l.closing_status?.toLowerCase() === step.key.toLowerCase()).length
      }
      const rate = i === 0 ? 100 : prev > 0 ? ((count / prev) * 100).toFixed(1) : 0
      prev = count
      return { label: step.label, count, rate }
    })
  }, [filtered])

  const dailyData = useMemo(() => {
    const days = {}
    filtered.forEach((l) => {
      const d = l.event_at?.split('T')[0]
      if (d) days[d] = (days[d] || 0) + 1
    })
    return Object.entries(days)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, leads: count }))
  }, [filtered])

  const campaignData = useMemo(
    () => getTop5WithOthers(aggregateBy(filtered, (l) => l.campaign_name)),
    [filtered]
  )
  const platformData = useMemo(
    () => getTop5WithOthers(aggregateBy(filtered, (l) => l.platform)),
    [filtered]
  )
  const adsetData = useMemo(
    () => getTop5WithOthers(aggregateBy(filtered, (l) => l.adset_name)),
    [filtered]
  )
  const adData = useMemo(
    () => getTop5WithOthers(aggregateBy(filtered, (l) => l.ad_name)),
    [filtered]
  )

  const placementBarData = useMemo(() => {
    const adNames = [...new Set(filtered.map((l) => l.ad_name || 'N/A'))].slice(0, 8)
    const map = {}
    filtered.forEach((l) => {
      const p = l.placement || 'N/A'
      const a = l.ad_name || 'N/A'
      if (!map[p]) {
        map[p] = { name: p }
        adNames.forEach((n) => (map[p][n] = 0))
      }
      if (adNames.includes(a)) map[p][a]++
      else map[p]['Autres'] = (map[p]['Autres'] || 0) + 1
    })
    return Object.values(map)
  }, [filtered])

  const tableData = useMemo(() => {
    const map = {}
    filtered.forEach((l) => {
      const ad = l.ad_name || 'N/A'
      if (!map[ad]) map[ad] = { ad, count: 0, status: 'En cours' }
      map[ad].count++
    })
    return Object.values(map).sort((a, b) => b.count - a.count)
  }, [filtered])

  const resetFilters = () => {
    setStartDate('')
    setEndDate('')
  }

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: '100%', overflowX: 'hidden', boxSizing: 'border-box' }}>

      {/* Filtres date */}
      <div
        style={{
          background: '#161616',
          border: '1px solid #1f1f1f',
          borderRadius: '12px',
          padding: '20px 24px',
          display: 'flex',
          gap: '32px',
          alignItems: 'flex-end',
        }}
      >
        <div>
          <label
            style={{
              color: '#888888',
              fontSize: '12px',
              fontWeight: 500,
              display: 'block',
              marginBottom: '6px',
            }}
          >
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
          <label
            style={{
              color: '#888888',
              fontSize: '12px',
              fontWeight: 500,
              display: 'block',
              marginBottom: '6px',
            }}
          >
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
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
            }}
          />
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

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', width: '100%' }}>
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
            <Users size={20} color="#00D18B" />
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
            Nombre de Leads
          </p>
          <p style={{ fontSize: '32px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
            {totalLeads}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
            <TrendingUp size={14} color="#00D18B" />
            <span style={{ color: '#00D18B', fontSize: '13px' }}>
              {leads.length > 0
                ? `${((totalLeads / leads.length) * 100).toFixed(1)}% du total`
                : ''}
            </span>
          </div>
        </div>

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
            <PenTool size={20} color="#00D18B" />
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
            Créatives en cours
          </p>
          <p style={{ fontSize: '32px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
            {activeCreatives}
          </p>
          <p style={{ color: '#888888', fontSize: '13px', marginTop: '8px' }}>
            annonce{activeCreatives > 1 ? 's' : ''} distincte{activeCreatives > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* LineChart + Funnel */}
      <div style={{ display: 'grid', gridTemplateColumns: '65fr 35fr', gap: '16px', alignItems: 'stretch', width: '100%' }}>
        <div style={chartCardStyle}>
          <p
            style={{
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 600,
              marginBottom: '20px',
            }}
          >
            Évolution des leads
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
              <XAxis dataKey="date" stroke="#888888" tick={{ fontSize: 12 }} />
              <YAxis stroke="#888888" tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area
                type="monotone"
                dataKey="leads"
                stroke="#00D18B"
                fill="#00D18B"
                fillOpacity={0.08}
              />
              <Line
                type="monotone"
                dataKey="leads"
                stroke="#00D18B"
                strokeWidth={2}
                dot={{ fill: '#00D18B', r: 3 }}
              />
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
          <p
            style={{
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 600,
              marginBottom: '16px',
            }}
          >
            Funnel de conversion
          </p>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2px' }}>
            {funnelData.map((step, i) => {
              const maxCount = funnelData[0].count || 1
              const widthPercent = (step.count / maxCount) * 100
              const opacity = 1 - i * 0.12
              return (
                <div key={step.label}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0' }}>
                    <span
                      style={{
                        width: '110px',
                        flexShrink: 0,
                        color: '#888888',
                        fontSize: '13px',
                        textAlign: 'right',
                      }}
                    >
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
                    <span
                      style={{
                        color: '#ffffff',
                        fontSize: '13px',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {step.count}
                    </span>
                    {i > 0 && (
                      <span
                        style={{
                          color: '#888888',
                          fontSize: '11px',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        {step.rate}%
                      </span>
                    )}
                  </div>
                  {i < funnelData.length - 1 && (
                    <div style={{ textAlign: 'center', color: '#444444', fontSize: '10px', lineHeight: 1 }}>
                      ▼
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 4 Donuts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        {[
          { title: 'Leads par campagne', data: campaignData },
          { title: 'Leads par plateforme', data: platformData },
          { title: 'Leads par adset', data: adsetData },
          { title: 'Leads par ad', data: adData },
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
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={data}
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
                  {data.map((_, i) => (
                    <Cell
                      key={i}
                      fill={DONUT_COLORS[i % DONUT_COLORS.length]}
                    />
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
        ))}
      </div>

      {/* BarChart empilé */}
      <div style={chartCardStyle}>
        <p
          style={{
            color: '#ffffff',
            fontSize: '15px',
            fontWeight: 600,
            marginBottom: '20px',
          }}
        >
          Leads par placement
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={placementBarData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
            <XAxis dataKey="name" stroke="#888888" tick={{ fontSize: 12 }} />
            <YAxis stroke="#888888" tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend
              verticalAlign="top"
              align="right"
              content={({ payload }) => (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'flex-start' }}>
                  {payload.map((entry, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: entry.color, display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ color: '#ffffff', fontSize: '12px' }}>{entry.value}</span>
                    </li>
                  ))}
                </ul>
              )}
            />
            {Object.keys(placementBarData[0] || {})
              .filter((k) => k !== 'name')
              .map((key, i) => (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId="a"
                  fill={DONUT_COLORS[i % DONUT_COLORS.length]}
                />
              ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tableau */}
      <div style={chartCardStyle}>
        <p
          style={{
            color: '#ffffff',
            fontSize: '15px',
            fontWeight: 600,
            marginBottom: '20px',
          }}
        >
          Détail des annonces
        </p>
        <div style={{ overflowX: 'auto' }}>
        <Table>
          <TableHeader>
            <TableRow style={{ background: '#161616', borderBottom: '1px solid #1f1f1f' }}>
              <TableHead
                style={{
                  color: '#888888',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Description
              </TableHead>
              <TableHead
                style={{
                  color: '#888888',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Statut
              </TableHead>
              <TableHead
                style={{
                  color: '#888888',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Nombre de leads
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
                <TableCell style={{ color: '#ffffff', fontSize: '14px' }}>
                  {row.ad}
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
                    {row.status}
                  </span>
                </TableCell>
                <TableCell
                  style={{ color: '#ffffff', fontSize: '14px', fontWeight: 600 }}
                >
                  {row.count}
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
