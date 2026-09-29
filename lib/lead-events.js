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

const PARIS_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
const eventDayCache = new Map()

// Jour calendaire (YYYY-MM-DD) d'un événement lead dans le fuseau où Airtable
// ("Date d'entrée") et GHL l'affichent — Europe/Paris, pas UTC. Sans ça, un
// lead créé à 23h30 à Paris tombe sur la veille dans les filtres et graphes.
export function eventDay(value) {
  if (value === null || value === undefined || value === '') return null
  const key = String(value)
  if (eventDayCache.has(key)) return eventDayCache.get(key)
  const timestamp = eventTimestamp(value)
  let day = null
  if (!Number.isNaN(timestamp)) {
    const parts = Object.fromEntries(
      PARIS_DAY.formatToParts(new Date(timestamp)).map((part) => [part.type, part.value])
    )
    day = `${parts.year}-${parts.month}-${parts.day}`
  }
  eventDayCache.set(key, day)
  return day
}

const normalize = (value) => String(value ?? '').trim().toLowerCase()

// Définitions uniques des statuts, partagées par toutes les pages pour
// qu'un même filtre donne le même chiffre partout.
export const isQualifiedStatus = (status) => normalize(status) === 'lead qualifié'
export const isNonQualifiedStatus = (status) => normalize(status) === 'lead non qualifié'
export const isNrpStatus = (status) => normalize(status).startsWith('nrp')
export const isNoShowStatus = (status) => normalize(status) === 'no-show'
export const isDealWonStatus = (status) => normalize(status) === 'deal won'
// Un Deal Won est aussi un Deal Qualifié.
export const isDealQualifiedStatus = (status) =>
  normalize(status) === 'deal qualifié' || isDealWonStatus(status)

// Plateforme/campagne : "Linkedin" côté leads, "linkedin" côté dépenses.
export const sameDimension = (a, b) => normalize(a) === normalize(b)

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
  return events.filter((event) => {
    const day = eventDay(event?.event_at)
    if (!day) return false
    if (startDate && day < startDate) return false
    if (endDate && day > endDate) return false
    return true
  })
}

// Événements dont la dimension (plateforme, campagne, réseau social) correspond
// au filtre, sans tenir compte de la casse. Filtre vide = pas de restriction.
export function filterEventsByDimensions(events = [], { platform, campaign, social } = {}) {
  return events.filter((event) =>
    (!platform || sameDimension(event.platform, platform)) &&
    (!campaign || sameDimension(event.campaign_name, campaign)) &&
    (!social || sameDimension(event.social_network, social))
  )
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
