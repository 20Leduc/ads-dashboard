import {
  countDistinctLeads,
  dedupeEventsByLead,
  filterEventsByDateRange,
  isDealQualifiedStatus,
  isDealWonStatus,
  isQualifiedStatus,
  latestEventByLead,
  splitLeadEvents,
} from './lead-events.js'
import { filterSpendByDateRange } from './spend.js'

const pad = (value) => String(value).padStart(2, '0')

// Raccourcis de période de la page d'accueil, en jours calendaires de Paris
// (YYYY-MM-DD) comme tous les filtres du dashboard. `today` est le jour de Paris.
export function periodRange(preset, today) {
  const [year, month] = today.split('-').map(Number)
  if (preset === 'month') return { startDate: `${year}-${pad(month)}-01`, endDate: today }
  if (preset === 'last-month') {
    const y = month === 1 ? year - 1 : year
    const m = month === 1 ? 12 : month - 1
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
    return { startDate: `${y}-${pad(m)}-01`, endDate: `${y}-${pad(m)}-${pad(lastDay)}` }
  }
  if (preset === '30-days') {
    const start = new Date(`${today}T00:00:00Z`)
    start.setUTCDate(start.getUTCDate() - 29)
    return { startDate: start.toISOString().slice(0, 10), endDate: today }
  }
  return { startDate: '', endDate: '' }
}

// Chiffres clés de la page d'accueil. Chaque étape est datée par son propre
// événement, avec les mêmes définitions que les pages Setting, Closing et Coûts.
export function buildOverview({ events = [], spend = [], startDate = '', endDate = '' }) {
  const { leadCreatedEvents, settingEvents, closingEvents } = splitLeadEvents(events)
  const datedClosing = filterEventsByDateRange(closingEvents, startDate, endDate)

  const leads = dedupeEventsByLead(filterEventsByDateRange(leadCreatedEvents, startDate, endDate)).length
  const qualifiedLeads = countDistinctLeads(
    filterEventsByDateRange(latestEventByLead(settingEvents.filter((e) => e.setting_status)), startDate, endDate),
    (e) => isQualifiedStatus(e.setting_status)
  )
  // Chez RWB, qualifier un lead c'est lui fixer un RDV : un lead qualifié = un deal.
  const deals = qualifiedLeads
  const qualifiedDeals = countDistinctLeads(datedClosing, (e) => isDealQualifiedStatus(e.closing_status))
  const dealsWon = countDistinctLeads(datedClosing, (e) => isDealWonStatus(e.closing_status))

  const totalSpend = filterSpendByDateRange(spend, startDate, endDate)
    .reduce((sum, row) => sum + (Number(row.spend) || 0), 0)
  const costPer = (count) => (count > 0 ? totalSpend / count : null)

  return {
    leads,
    qualifiedLeads,
    deals,
    qualifiedDeals,
    dealsWon,
    spend: totalSpend,
    costPerLead: costPer(leads),
    costPerQualifiedLead: costPer(qualifiedLeads),
    costPerDeal: costPer(deals),
    costPerQualifiedDeal: costPer(qualifiedDeals),
  }
}
