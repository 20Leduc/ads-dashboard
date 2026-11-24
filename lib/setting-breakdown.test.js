import test from 'node:test'
import assert from 'node:assert/strict'

import { breakdownPieData } from './closing-breakdown.js'
import { buildSettingBreakdown, SETTING_MEASURES } from './setting-breakdown.js'

const status = (id, setting_status, campaign, adset, ad) => ({
  lead_id: id, event_type: 'setting_updated', setting_status, campaign_name: campaign, adset_name: adset, ad_name: ad,
})

const statusEvents = [
  status('a', 'Lead qualifié', 'CBO V5', 'Adset 1', 'Ad 4'),
  status('b', 'Lead qualifié', 'CBO V5', 'Adset 1', 'Ad 4'),
  status('c', 'Lead Non qualifié', 'CBO V5', 'Adset 2', 'Ad 1'),
  status('d', 'Lead qualifié', 'OPTIN 2', 'Adset 9', 'Ad 4'),
  status('e', 'NRP +2', 'OPTIN 2', 'Adset 9', 'Ad 4'),
  status('a', 'Lead qualifié', 'CBO V5', 'Adset 1', 'Ad 4'), // même lead : compté une fois
]

test('le menu déroulant propose Lead qualifié et Lead Non qualifié', () => {
  assert.deepEqual(SETTING_MEASURES, [
    { key: 'qualified', label: 'Lead qualifié' },
    { key: 'nonQualified', label: 'Lead Non qualifié' },
  ])
})

test('par campagne, chaque statut compte des leads distincts', () => {
  const rows = buildSettingBreakdown({ dimension: 'campaign', statusEvents })
  const cbo = rows.find((r) => r.name === 'CBO V5')
  assert.equal(cbo.qualified, 2)
  assert.equal(cbo.nonQualified, 1)
  const optin = rows.find((r) => r.name === 'OPTIN 2')
  assert.equal(optin.qualified, 1)
  assert.equal(optin.nonQualified, 0)
})

test('par annonce, une même annonce dans deux campagnes reste distincte dans le camembert', () => {
  const rows = buildSettingBreakdown({ dimension: 'ad', statusEvents })
  assert.deepEqual(breakdownPieData(rows, 'qualified'), [
    { name: 'Ad 4 (CBO V5)', value: 2 },
    { name: 'Ad 4 (OPTIN 2)', value: 1 },
  ])
  assert.deepEqual(breakdownPieData(rows, 'nonQualified'), [{ name: 'Ad 1', value: 1 }])
})

test('une dimension absente devient N/A', () => {
  const rows = buildSettingBreakdown({ dimension: 'adset', statusEvents: [status('x', 'Lead qualifié', null, null, null)] })
  assert.equal(rows[0].name, 'N/A')
  assert.deepEqual(rows[0].parents, ['N/A'])
})
