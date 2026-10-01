import test from 'node:test'
import assert from 'node:assert/strict'

import { clientPath, resolveDashboardRoute, switchClientPath } from './client-routes.js'

const clients = [
  { slug: 'learnim', name: 'LEARNIM', schema_name: 'client_learnim' },
  { slug: 'robin-worms', name: 'Robin Worms', schema_name: 'client_robin_worms' },
]

test('a client URL opens that client when the account has access', () => {
  const route = resolveDashboardRoute({ clients, slug: 'robin-worms', pathname: '/dashboard/robin-worms/leads', lastSlug: null })
  assert.equal(route.type, 'ok')
  assert.equal(route.client.schema_name, 'client_robin_worms')
})

test('/dashboard redirects to the last visited client, else the first one', () => {
  assert.deepEqual(
    resolveDashboardRoute({ clients, slug: undefined, pathname: '/dashboard', lastSlug: 'robin-worms' }),
    { type: 'redirect', to: '/dashboard/robin-worms' }
  )
  assert.deepEqual(
    resolveDashboardRoute({ clients, slug: undefined, pathname: '/dashboard', lastSlug: 'inconnu' }),
    { type: 'redirect', to: '/dashboard/learnim' }
  )
})

test('old URLs without a client keep the requested page', () => {
  assert.deepEqual(
    resolveDashboardRoute({ clients, slug: 'costs', pathname: '/dashboard/costs', lastSlug: 'robin-worms' }),
    { type: 'redirect', to: '/dashboard/robin-worms/costs' }
  )
})

test("another client's URL is refused, never served", () => {
  const route = resolveDashboardRoute({
    clients: [clients[1]], slug: 'learnim', pathname: '/dashboard/learnim/leads', lastSlug: null,
  })
  assert.equal(route.type, 'forbidden')
  assert.equal(route.fallback.slug, 'robin-worms')
})

test('an account without any client gets no data route', () => {
  assert.deepEqual(
    resolveDashboardRoute({ clients: [], slug: 'robin-worms', pathname: '/dashboard/robin-worms', lastSlug: null }),
    { type: 'no-clients' }
  )
})

test('switching client keeps the current page', () => {
  assert.equal(switchClientPath('/dashboard/robin-worms/closing', 'robin-worms', 'learnim'), '/dashboard/learnim/closing')
  assert.equal(switchClientPath('/dashboard/robin-worms', 'robin-worms', 'learnim'), '/dashboard/learnim')
  assert.equal(clientPath('learnim', 'leads'), '/dashboard/learnim/leads')
})
