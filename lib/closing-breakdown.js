import { isDealQualifiedStatus, isDealWonStatus, isNoShowStatus } from './lead-events.js'

// Détail Closing par campagne, adset ou annonce. Une annonce (ou un adset) est
// identifiée avec ses parents : le même nom d'annonce réutilisé dans deux
// campagnes donne deux lignes distinctes.
export const BREAKDOWN_DIMENSIONS = {
  campaign: { label: 'Campagne', fields: ['campaign_name'] },
  adset: { label: 'Adset', fields: ['campaign_name', 'adset_name'] },
  ad: { label: 'Annonce', fields: ['campaign_name', 'adset_name', 'ad_name'] },
}

const normalize = (value) => String(value ?? '').trim().toLowerCase()
const statusIs = (expected) => (status) => normalize(status) === expected

// Statuts comptés sur tous les événements de la période (leads distincts),
// comme les cartes de la page. Le No-Show, lui, n'est retenu que s'il est le
// dernier statut de la période (voir latestClosingEvents).
const PERIOD_STATUSES = {
  dealQualified: isDealQualifiedStatus,
  dealNonQualified: statusIs('deal non qualifié'),
  dealWon: isDealWonStatus,
  dealLost: statusIs('deal lost'),
  proposalSent: statusIs('proposal sent'),
  proposalSigned: statusIs('proposal signed'),
}

export function buildClosingBreakdown({
  dimension = 'campaign',
  rdvEvents = [],
  closingEvents = [],
  latestClosingEvents = [],
} = {}) {
  const { fields } = BREAKDOWN_DIMENSIONS[dimension] ?? BREAKDOWN_DIMENSIONS.campaign
  const rows = new Map()
  const rowFor = (event) => {
    const values = fields.map((field) => event?.[field] || 'N/A')
    const key = values.join('\u0000')
    if (!rows.has(key)) {
      rows.set(key, {
        key,
        name: values.at(-1),
        parents: values.slice(0, -1),
        sets: Object.fromEntries(['rdv', 'noShow', ...Object.keys(PERIOD_STATUSES)].map((k) => [k, new Set()])),
      })
    }
    return rows.get(key)
  }

  for (const event of rdvEvents) if (event?.lead_id) rowFor(event).sets.rdv.add(event.lead_id)
  for (const event of latestClosingEvents) {
    if (event?.lead_id && isNoShowStatus(event.closing_status)) rowFor(event).sets.noShow.add(event.lead_id)
  }
  for (const event of closingEvents) {
    if (!event?.lead_id) continue
    for (const [column, matches] of Object.entries(PERIOD_STATUSES)) {
      if (matches(event.closing_status)) rowFor(event).sets[column].add(event.lead_id)
    }
  }

  return [...rows.values()]
    .map(({ key, name, parents, sets }) => {
      const counts = Object.fromEntries(Object.entries(sets).map(([k, set]) => [k, set.size]))
      return { key, name, parents, ...counts, closingRate: counts.rdv > 0 ? (counts.dealWon * 100) / counts.rdv : null }
    })
    .sort((a, b) => b.dealWon - a.dealWon || b.dealQualified - a.dealQualified || b.rdv - a.rdv || a.name.localeCompare(b.name))
}
