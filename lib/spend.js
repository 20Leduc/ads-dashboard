import { eventDay } from './lead-events.js'

// Jour d'une ligne de dépense, dans le même fuseau que les leads (Europe/Paris).
// Make envoie la dépense du jour vers 23h à Paris ; les dépenses saisies au
// jour près sont stockées à minuit heure de Paris, soit 22h ou 23h UTC la
// veille selon l'heure d'été. En jour UTC, ces dernières tombaient la veille.
export const spendDay = (row) => eventDay(row?.spend_date)

// CPM de la période : dépense totale / impressions totales × 1000. Les
// impressions d'une ligne se déduisent de sa dépense et de son CPM ; une
// moyenne simple des CPM donnerait le même poids à 3 € qu'à 170 € de dépense.
export function weightedCpm(spend = []) {
  let total = 0
  let impressions = 0
  for (const row of spend) {
    const amount = Number(row?.spend)
    const cpm = Number(row?.cpm)
    if (!(amount > 0) || !(cpm > 0)) continue
    total += amount
    impressions += (amount / cpm) * 1000
  }
  return impressions > 0 ? (total / impressions) * 1000 : 0
}

// Période incluse aux deux bornes (YYYY-MM-DD). Sans période, tout est gardé ;
// avec une période, une dépense sans date ne peut pas y être rattachée.
export function filterSpendByDateRange(spend = [], startDate = '', endDate = '') {
  if (!startDate && !endDate) return spend
  return spend.filter((row) => {
    const day = spendDay(row)
    if (!day) return false
    if (startDate && day < startDate) return false
    if (endDate && day > endDate) return false
    return true
  })
}
