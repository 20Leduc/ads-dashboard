import test from 'node:test'
import assert from 'node:assert/strict'

import { buildOverview, periodRange } from './overview.js'

test('the period presets give Paris calendar days, both bounds included', () => {
  assert.deepEqual(periodRange('month', '2026-10-16'), { startDate: '2026-10-01', endDate: '2026-10-16' })
  assert.deepEqual(periodRange('last-month', '2026-10-16'), { startDate: '2026-09-01', endDate: '2026-09-30' })
  assert.deepEqual(periodRange('last-month', '2026-01-05'), { startDate: '2025-12-01', endDate: '2025-12-31' })
  assert.deepEqual(periodRange('30-days', '2026-10-16'), { startDate: '2026-09-17', endDate: '2026-10-16' })
  assert.deepEqual(periodRange('all', '2026-10-16'), { startDate: '', endDate: '' })
})

const events = [
  { lead_id: 'a', event_type: 'lead_created', event_at: '2026-10-01T09:00:00Z' },
  { lead_id: 'b', event_type: 'lead_created', event_at: '2026-10-02T09:00:00Z' },
  { lead_id: 'c', event_type: 'lead_created', event_at: '2026-10-03T09:00:00Z' },
  { lead_id: 'd', event_type: 'lead_created', event_at: '2026-10-04T09:00:00Z' },
  { lead_id: 'old', event_type: 'lead_created', event_at: '2026-09-10T09:00:00Z' },
  { lead_id: 'a', event_type: 'setting_updated', event_at: '2026-10-02T09:00:00Z', setting_status: 'Lead qualifié' },
  { lead_id: 'b', event_type: 'setting_updated', event_at: '2026-10-03T09:00:00Z', setting_status: 'Lead qualifié' },
  { lead_id: 'c', event_type: 'setting_updated', event_at: '2026-10-04T09:00:00Z', setting_status: 'NRP +1' },
  { lead_id: 'a', event_type: 'closing_updated', event_at: '2026-10-05T09:00:00Z', closing_status: 'Deal' },
  { lead_id: 'a', event_type: 'closing_updated', event_at: '2026-10-08T09:00:00Z', closing_status: 'Deal Won' },
  { lead_id: 'b', event_type: 'closing_updated', event_at: '2026-10-06T09:00:00Z', closing_status: 'Deal Qualifié' },
  { lead_id: 'c', event_type: 'closing_updated', event_at: '2026-10-07T09:00:00Z', closing_status: 'Deal Lost' },
]
const spend = [
  { spend_date: '2026-10-01T21:00:00+00:00', spend: 300 },
  { spend_date: '2026-10-02T21:00:00+00:00', spend: 100 },
  { spend_date: '2026-09-15T21:00:00+00:00', spend: 999 },
]

test('the overview counts each stage by its own date and divides the spend of the period', () => {
  assert.deepEqual(buildOverview({ events, spend, startDate: '2026-10-01', endDate: '2026-10-31' }), {
    leads: 4,
    qualifiedLeads: 2,
    deals: 2,
    qualifiedDeals: 2,
    dealsWon: 1,
    spend: 400,
    costPerLead: 100,
    costPerQualifiedLead: 200,
    costPerDeal: 200,
    costPerQualifiedDeal: 200,
  })
})

test('a cost is empty when nothing happened in the period', () => {
  const overview = buildOverview({ events: [], spend, startDate: '2026-10-01', endDate: '2026-10-31' })
  assert.equal(overview.spend, 400)
  assert.equal(overview.costPerLead, null)
  assert.equal(overview.costPerDeal, null)
})

test('the number of deals is the number of qualified leads', () => {
  // Un lead qualifié = un RDV pris = un deal, même sans événement Closing ;
  // une issue Closing sans qualification Setting n'est pas un deal.
  const overview = buildOverview({
    events: [
      { lead_id: 'q1', event_type: 'setting_updated', event_at: '2026-10-02T09:00:00Z', setting_status: 'Lead qualifié' },
      { lead_id: 'q3', event_type: 'setting_updated', event_at: '2026-10-04T09:00:00Z', setting_status: 'Lead qualifié' },
      { lead_id: 'q2', event_type: 'setting_updated', event_at: '2026-10-03T09:00:00Z', setting_status: 'Lead qualifié', closing_status: 'Deal' },
      { lead_id: 'late', event_type: 'setting_updated', event_at: '2026-09-20T09:00:00Z', setting_status: 'Lead qualifié' },
      { lead_id: 'late', event_type: 'closing_updated', event_at: '2026-10-06T09:00:00Z', closing_status: 'No-Show' },
    ],
    spend,
    startDate: '2026-10-01',
    endDate: '2026-10-31',
  })
  assert.equal(overview.qualifiedLeads, 3)
  assert.equal(overview.deals, 3)
  assert.equal(overview.costPerDeal, overview.costPerQualifiedLead)
})

test('a requalified lead counts in the month of its first qualification', () => {
  const requalified = [
    { lead_id: 'r', event_type: 'setting_updated', event_at: '2026-09-16T09:00:00Z', setting_status: 'Lead qualifié' },
    { lead_id: 'r', event_type: 'setting_updated', event_at: '2026-10-20T09:00:00Z', setting_status: 'Lead qualifié', closing_status: 'Deal' },
  ]
  const october = buildOverview({ events: requalified, spend, startDate: '2026-10-01', endDate: '2026-10-31' })
  const september = buildOverview({ events: requalified, spend, startDate: '2026-09-01', endDate: '2026-09-30' })
  assert.equal(october.qualifiedLeads, 0)
  assert.equal(october.deals, 0)
  assert.equal(september.qualifiedLeads, 1)
  assert.equal(september.deals, 1)
})
