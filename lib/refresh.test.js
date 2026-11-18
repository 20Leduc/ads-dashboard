import test from 'node:test'
import assert from 'node:assert/strict'

import { isStale, REFRESH_INTERVAL_MS, REFRESH_ON_RETURN_AFTER_MS } from './refresh.js'

test('data is stale once it is at least as old as the allowed age', () => {
  const now = 1_000_000
  assert.equal(isStale(now - REFRESH_INTERVAL_MS, now, REFRESH_INTERVAL_MS), true)
  assert.equal(isStale(now - REFRESH_INTERVAL_MS + 1, now, REFRESH_INTERVAL_MS), false)
  assert.equal(isStale(now - REFRESH_ON_RETURN_AFTER_MS, now, REFRESH_ON_RETURN_AFTER_MS), true)
})

test('nothing is stale before the first load has been requested', () => {
  assert.equal(isStale(null, 1_000_000, REFRESH_INTERVAL_MS), false)
  assert.equal(isStale(undefined, 1_000_000, REFRESH_INTERVAL_MS), false)
})

test('coming back to the tab refreshes sooner than the periodic refresh', () => {
  assert.ok(REFRESH_ON_RETURN_AFTER_MS < REFRESH_INTERVAL_MS)
  assert.equal(REFRESH_INTERVAL_MS, 10 * 60 * 1000)
})
