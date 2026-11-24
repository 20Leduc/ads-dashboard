import { BREAKDOWN_DIMENSIONS } from './closing-breakdown.js'
import { isNonQualifiedStatus, isQualifiedStatus } from './lead-events.js'

// Mesures proposées dans le menu déroulant des camemberts Setting.
export const SETTING_MEASURES = [
  { key: 'qualified', label: 'Lead qualifié' },
  { key: 'nonQualified', label: 'Lead Non qualifié' },
]

const MATCHERS = { qualified: isQualifiedStatus, nonQualified: isNonQualifiedStatus }

// Répartition Setting par campagne, adset ou annonce, à partir des statuts
// actuels datés dans la période (un événement par lead). Chaque lead est
// compté une fois par mesure ; une annonce est identifiée avec ses parents,
// comme dans le détail Closing.
export function buildSettingBreakdown({ dimension = 'campaign', statusEvents = [] } = {}) {
  const { fields } = BREAKDOWN_DIMENSIONS[dimension] ?? BREAKDOWN_DIMENSIONS.campaign
  const rows = new Map()

  for (const event of statusEvents) {
    if (!event?.lead_id) continue
    const values = fields.map((field) => event[field] || 'N/A')
    const key = values.join('\u0000')
    if (!rows.has(key)) {
      rows.set(key, {
        key,
        name: values.at(-1),
        parents: values.slice(0, -1),
        sets: Object.fromEntries(Object.keys(MATCHERS).map((k) => [k, new Set()])),
      })
    }
    for (const [measure, matches] of Object.entries(MATCHERS)) {
      if (matches(event.setting_status)) rows.get(key).sets[measure].add(event.lead_id)
    }
  }

  return [...rows.values()]
    .map(({ key, name, parents, sets }) => ({
      key,
      name,
      parents,
      ...Object.fromEntries(Object.entries(sets).map(([k, set]) => [k, set.size])),
    }))
    .sort((a, b) => b.qualified - a.qualified || b.nonQualified - a.nonQualified || a.name.localeCompare(b.name))
}
