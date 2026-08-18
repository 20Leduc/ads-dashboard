import test from 'node:test'
import assert from 'node:assert/strict'

import {
  countDistinctLeads,
  dedupeEventsByLead,
  dedupeEventsByKey,
  enrichEventsWithLeadSnapshots,
  filterEventsByDateRange,
  latestEventByLead,
  splitLeadEvents,
} from './lead-events.js'

const events = [
  {
    lead_id: 'lead-1',
    event_type: 'lead_created',
    event_at: '2026-07-01T10:00:00.000Z',
    campaign_name: 'Campagne A',
    platform: 'Meta',
    setting_status: 'Lead qualifié',
  },
  {
    lead_id: 'lead-1',
    event_type: 'setting_updated',
    event_at: '2026-08-10T12:00:00.000Z',
    campaign_name: null,
    platform: null,
    setting_status: 'Lead qualifié',
  },
  {
    lead_id: 'lead-1',
    event_type: 'setting_updated',
    event_at: '2026-08-11T12:00:00.000Z',
    setting_status: 'Lead qualifié',
  },
  {
    lead_id: 'lead-1',
    event_type: 'closing_updated',
    event_at: '2026-08-31T23:59:59.500Z',
    closing_status: 'Deal Won',
  },
]

test('splitLeadEvents excludes snapshot statuses from Setting and Closing events', () => {
  const result = splitLeadEvents(events)

  assert.equal(result.leadCreatedEvents.length, 1)
  assert.equal(result.settingEvents.length, 2)
  assert.equal(result.closingEvents.length, 1)
  assert.ok(result.settingEvents.every((event) => event.event_type === 'setting_updated'))
  assert.ok(result.closingEvents.every((event) => event.event_type === 'closing_updated'))
})

test('countDistinctLeads deduplicates repeated lead/status updates', () => {
  const { settingEvents } = splitLeadEvents(events)

  assert.equal(
    countDistinctLeads(settingEvents, (event) => event.setting_status === 'Lead qualifié'),
    1
  )
})

test('dedupeEventsByLead returns one representative event per lead', () => {
  const { settingEvents } = splitLeadEvents(events)

  assert.equal(dedupeEventsByLead(settingEvents).length, 1)
})

test('dedupeEventsByKey keeps one event per composite lead/status key', () => {
  const { settingEvents } = splitLeadEvents([
    ...events,
    {
      lead_id: 'lead-1',
      event_type: 'setting_updated',
      event_at: '2026-08-12T12:00:00.000Z',
      setting_status: 'NRP',
    },
  ])
  const unique = dedupeEventsByKey(
    settingEvents,
    (event) => `${event.lead_id}:${event.setting_status}`
  )

  assert.equal(unique.length, 2)
})

test('enrichment keeps snapshot dimensions when an update contains null values', () => {
  const { leadCreatedEvents, settingEvents } = splitLeadEvents(events)
  const [enriched] = enrichEventsWithLeadSnapshots(settingEvents, leadCreatedEvents)

  assert.equal(enriched.campaign_name, 'Campagne A')
  assert.equal(enriched.platform, 'Meta')
  assert.equal(enriched.setting_status, 'Lead qualifié')
  assert.equal(enriched.event_type, 'setting_updated')
  assert.equal(enriched.event_at, '2026-08-10T12:00:00.000Z')
})

test('filterEventsByDateRange includes milliseconds at the end of the selected day', () => {
  const { closingEvents } = splitLeadEvents(events)

  assert.equal(filterEventsByDateRange(closingEvents, '2026-08-01', '2026-08-31').length, 1)
  assert.equal(filterEventsByDateRange(closingEvents, '2026-09-01', '').length, 0)
})

test('invalid events and invalid dates are ignored safely', () => {
  const result = splitLeadEvents([null, {}, { event_type: 'unknown' }])
  assert.deepEqual(result, {
    leadCreatedEvents: [],
    settingEvents: [],
    closingEvents: [],
  })
  assert.deepEqual(filterEventsByDateRange([{ lead_id: 'bad', event_at: 'not-a-date' }]), [])
})

test('enrichment never inherits owner or raw event fields from a snapshot', () => {
  const [enriched] = enrichEventsWithLeadSnapshots(
    [{
      lead_id: 'lead-null',
      event_type: 'setting_updated',
      event_at: null,
      setting_status: null,
      campaign_name: null,
    }],
    [{
      lead_id: 'lead-null',
      event_type: 'lead_created',
      event_at: '2026-08-01T10:00:00Z',
      setting_status: 'Lead qualifié',
      closing_status: 'Deal Won',
      campaign_name: 'Campagne snapshot',
      field_changed: 'setting_status',
      old_value: 'NRP',
      new_value: 'Lead qualifié',
      raw_data_json: { secret: true },
    }]
  )

  assert.equal(enriched.event_type, 'setting_updated')
  assert.equal(enriched.event_at, null)
  assert.equal(enriched.setting_status, null)
  assert.equal(enriched.closing_status, undefined)
  assert.equal(enriched.field_changed, undefined)
  assert.equal(enriched.raw_data_json, undefined)
  assert.equal(enriched.campaign_name, 'Campagne snapshot')
  assert.deepEqual(filterEventsByDateRange([enriched]), [])
})

test('snapshot selection compares actual timestamps including timezone offsets', () => {
  const [enriched] = enrichEventsWithLeadSnapshots(
    [{ lead_id: 'lead-zone', event_type: 'setting_updated', event_at: '2026-08-01T00:00:00Z' }],
    [
      { lead_id: 'lead-zone', event_type: 'lead_created', event_at: '2025-12-31T23:00:00Z', campaign_name: 'Later' },
      { lead_id: 'lead-zone', event_type: 'lead_created', event_at: '2026-01-01T00:00:00+02:00', campaign_name: 'Earlier' },
    ]
  )

  assert.equal(enriched.campaign_name, 'Earlier')
})

test('dedupeEventsByKey ignores events without a lead_id', () => {
  const unique = dedupeEventsByKey(
    [{ lead_id: null, setting_status: 'NRP' }, { setting_status: 'NRP' }],
    (event) => event.setting_status
  )

  assert.deepEqual(unique, [])
})

test('latestEventByLead creates an exclusive latest Closing classification', () => {
  const latest = latestEventByLead([
    { id: 'a', lead_id: 'lead-1', event_at: '2026-08-01T10:00:00Z', closing_status: 'No-Show' },
    { id: 'b', lead_id: 'lead-1', event_at: '2026-08-02T10:00:00Z', closing_status: 'Deal Won' },
    { id: 'c', lead_id: 'lead-2', event_at: '2026-08-03T10:00:00Z', closing_status: 'No-Show' },
    { id: 'd', lead_id: 'lead-2', event_at: '2026-08-03T10:00:00Z', closing_status: 'Proposal Sent' },
  ])

  assert.deepEqual(latest.map((event) => [event.lead_id, event.closing_status]), [
    ['lead-1', 'Deal Won'],
    ['lead-2', 'Proposal Sent'],
  ])
})
