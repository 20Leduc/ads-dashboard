// Rechargement automatique des données du dashboard (leads + dépenses).
// Toutes les 10 minutes tant que l'onglet est affiché, et dès qu'on revient
// sur l'onglet si le dernier chargement date de plus de 2 minutes.
export const REFRESH_INTERVAL_MS = 10 * 60 * 1000
export const REFRESH_ON_RETURN_AFTER_MS = 2 * 60 * 1000
export const REFRESH_CHECK_EVERY_MS = 60 * 1000

// `requestedAt` : moment (ms) du dernier chargement demandé, null avant le premier.
export function isStale(requestedAt, now, maxAgeMs) {
  return typeof requestedAt === 'number' && now - requestedAt >= maxAgeMs
}
