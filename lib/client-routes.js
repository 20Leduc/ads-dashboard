// Chaque client a sa propre adresse : /dashboard/<slug>/<page>.
export const DASHBOARD_PAGES = ['leads', 'setting', 'closing', 'ads', 'costs']

const LAST_CLIENT_KEY = 'aicliently:last-client'

export function readLastClientSlug() {
  try {
    return localStorage.getItem(LAST_CLIENT_KEY)
  } catch {
    return null
  }
}

export function storeLastClientSlug(slug) {
  try {
    localStorage.setItem(LAST_CLIENT_KEY, slug)
  } catch {
    // Stockage indisponible (navigation privée) : on retombera sur le premier client.
  }
}

export function clientPath(slug, page = '') {
  return `/dashboard/${slug}${page ? `/${page}` : ''}`
}

// Même page, autre client : /dashboard/a/leads -> /dashboard/b/leads.
export function switchClientPath(pathname, fromSlug, toSlug) {
  const prefix = `/dashboard/${fromSlug}`
  const rest = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : ''
  return `/dashboard/${toSlug}${rest}`
}

// Décide quoi afficher pour une adresse /dashboard/... selon les clients du compte.
export function resolveDashboardRoute({ clients, slug, pathname, lastSlug }) {
  if (!clients.length) return { type: 'no-clients' }
  const fallback = clients.find((c) => c.slug === lastSlug) || clients[0]
  if (!slug) return { type: 'redirect', to: clientPath(fallback.slug) }
  const client = clients.find((c) => c.slug === slug)
  if (client) return { type: 'ok', client }
  // Anciennes adresses sans client (/dashboard/leads) : on garde la page demandée.
  if (DASHBOARD_PAGES.includes(slug)) {
    return { type: 'redirect', to: `/dashboard/${fallback.slug}${pathname.slice('/dashboard'.length)}` }
  }
  return { type: 'forbidden', fallback }
}
