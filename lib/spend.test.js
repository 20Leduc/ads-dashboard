import test from 'node:test'
import assert from 'node:assert/strict'

import { filterSpendByDateRange, spendDay, weightedCpm } from './spend.js'

test('a spend sent by Make in the evening stays on its own day', () => {
  // 23h02 à Paris
  assert.equal(spendDay({ spend_date: '2026-10-08T21:02:25.746+00:00' }), '2026-10-08')
})

test('a spend entered for a day is stored at Paris midnight and keeps that day', () => {
  // Minuit à Paris : 22h UTC la veille en été, 23h UTC en hiver.
  assert.equal(spendDay({ spend_date: '2026-08-31T22:00:00+00:00' }), '2026-09-01')
  assert.equal(spendDay({ spend_date: '2026-02-28T23:00:00+00:00' }), '2026-03-01')
})

test('the date range keeps spend by its Paris day, both bounds included', () => {
  const spend = [
    { id: 'aug-31', spend_date: '2026-08-31T21:01:00+00:00' },
    { id: 'sep-1', spend_date: '2026-08-31T22:00:00+00:00' },
    { id: 'sep-30', spend_date: '2026-09-30T21:02:00+00:00' },
    { id: 'oct-1', spend_date: '2026-09-30T22:00:00+00:00' },
  ]
  assert.deepEqual(
    filterSpendByDateRange(spend, '2026-09-01', '2026-09-30').map((row) => row.id),
    ['sep-1', 'sep-30']
  )
})

test('a spend without date only counts when no date range is set', () => {
  const spend = [{ id: 'undated', spend_date: null }, { id: 'dated', spend_date: '2026-09-10T21:00:00+00:00' }]
  assert.deepEqual(filterSpendByDateRange(spend, '', '').map((row) => row.id), ['undated', 'dated'])
  assert.deepEqual(filterSpendByDateRange(spend, '2026-09-01', '').map((row) => row.id), ['dated'])
})

test('the CPM weighs each spend line by its impressions, not a plain average', () => {
  // 100 € a 10 € de CPM = 10 000 impressions ; 10 € a 50 € de CPM = 200 impressions
  const spend = [{ spend: 100, cpm: 10 }, { spend: 10, cpm: 50 }]
  assert.equal(weightedCpm(spend).toFixed(4), (110 / 10200 * 1000).toFixed(4))
})

test('a spend line without CPM is left out of the CPM', () => {
  assert.equal(weightedCpm([{ spend: 100, cpm: 10 }, { spend: 40, cpm: null }, { spend: 5, cpm: 0 }]), 10)
  assert.equal(weightedCpm([]), 0)
})
