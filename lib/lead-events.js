const EVENT_TYPES = {
  LEAD_CREATED: 'lead_created',
  SETTING_UPDATED: 'setting_updated',
  CLOSING_UPDATED: 'closing_updated',
}

const SNAPSHOT_DIMENSION_FIELDS = [
  'campaign_id',
  'adset_id',
  'ad_id',
  'platform',
  'social_network',
  'campaign_name',
  'adset_name',
  'ad_name',
  'firstname',
  'lastname',
  'email',
  'phone',
  'placement',
  'device',
  'type_projet',
  'type_achat',
  'age_range',
  'job_situation',
  'salary_range',
]

function eventTimestamp(value) {
  if (value === null || value === undefined || value === '') return Number.NaN
  return new Date(value).getTime()
}

export function splitLeadEvents(events = []) {
  const validEvents = events.filter((event) => event && typeof event === 'object')

  return {
    leadCreatedEvents: validEvents.filter(
      (event) => event.event_type === EVENT_TYPES.LEAD_CREATED
    ),
    settingEvents: validEvents.filter(
      (event) => event.event_type === EVENT_TYPES.SETTING_UPDATED
    ),
    closingEvents: validEvents.filter(
      (event) => event.event_type === EVENT_TYPES.CLOSING_UPDATED
    ),
  }
}

export function enrichEventsWithLeadSnapshots(events = [], leadCreatedEvents = []) {
  const snapshotsByLeadId = new Map()

  for (const snapshot of leadCreatedEvents) {
    if (!snapshot?.lead_id) continue
    const snapshotTime = eventTimestamp(snapshot.event_at)
    if (Number.isNaN(snapshotTime)) continue
    const current = snapshotsByLeadId.get(snapshot.lead_id)
    const currentTime = current ? eventTimestamp(current.event_at) : Number.POSITIVE_INFINITY
    if (!current || snapshotTime < currentTime) {
      snapshotsByLeadId.set(snapshot.lead_id, snapshot)
    }
  }

  return events.filter(Boolean).map((event) => {
    const snapshot = snapshotsByLeadId.get(event.lead_id) || {}
    const enrichedEvent = { ...event }

    for (const field of SNAPSHOT_DIMENSION_FIELDS) {
      if (
        (enrichedEvent[field] === null || enrichedEvent[field] === undefined) &&
        snapshot[field] !== null &&
        snapshot[field] !== undefined
      ) {
        enrichedEvent[field] = snapshot[field]
      }
    }

    return enrichedEvent
  })
}

export function filterEventsByDateRange(events = [], startDate = '', endDate = '') {
  const start = startDate ? new Date(`${startDate}T00:00:00.000Z`) : null
  const endExclusive = endDate ? new Date(`${endDate}T00:00:00.000Z`) : null
  if (endExclusive && !Number.isNaN(endExclusive.getTime())) {
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1)
  }

  return events.filter((event) => {
    const timestamp = eventTimestamp(event?.event_at)
    if (Number.isNaN(timestamp)) return false
    const eventDate = new Date(timestamp)
    if (start && !Number.isNaN(start.getTime()) && eventDate < start) return false
    if (endExclusive && !Number.isNaN(endExclusive.getTime()) && eventDate >= endExclusive) {
      return false
    }
    return true
  })
}

export function distinctLeadIds(events = [], predicate = () => true) {
  return new Set(
    events
      .filter((event) => event?.lead_id && predicate(event))
      .map((event) => event.lead_id)
  )
}

export function dedupeEventsByLead(events = []) {
  const eventsByLeadId = new Map()
  for (const event of events) {
    if (!event?.lead_id || eventsByLeadId.has(event.lead_id)) continue
    eventsByLeadId.set(event.lead_id, event)
  }
  return [...eventsByLeadId.values()]
}

export function dedupeEventsByKey(events = [], keyFn) {
  if (typeof keyFn !== 'function') return []
  const eventsByKey = new Map()
  for (const event of events) {
    if (!event?.lead_id) continue
    const key = keyFn(event)
    if (key === null || key === undefined || eventsByKey.has(key)) continue
    eventsByKey.set(key, event)
  }
  return [...eventsByKey.values()]
}

export function latestEventByLead(events = []) {
  const latestByLeadId = new Map()
  for (const event of events) {
    if (!event?.lead_id) continue
    const eventTime = eventTimestamp(event.event_at)
    if (Number.isNaN(eventTime)) continue
    const current = latestByLeadId.get(event.lead_id)
    const currentTime = current ? eventTimestamp(current.event_at) : Number.NEGATIVE_INFINITY
    const isLater = eventTime > currentTime
    const winsTie = eventTime === currentTime && String(event.id || '') > String(current?.id || '')
    if (!current || isLater || winsTie) latestByLeadId.set(event.lead_id, event)
  }
  return [...latestByLeadId.values()]
}

export function countDistinctLeads(events = [], predicate = () => true) {
  return distinctLeadIds(events, predicate).size
}
