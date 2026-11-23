import test from 'node:test'
import assert from 'node:assert/strict'

import { buildClosingBreakdown } from './closing-breakdown.js'

const lead = (id, campaign, adset, ad) => ({ lead_id: id, campaign_name: campaign, adset_name: adset, ad_name: ad })
const closing = (id, status, dims) => ({ ...dims, lead_id: id, closing_status: status, event_type: 'closing_updated' })

const A = lead('a', 'CBO V5', 'Adset 1', 'Ad 4')
const B = lead('b', 'CBO V5', 'Adset 1', 'Ad 4')
const C = lead('c', 'CBO V5', 'Adset 2', 'Ad 1')
const D = lead('d', 'OPTIN 2', 'Adset 9', 'Ad 4')

const rdvEvents = [A, B, C, D]
const closingEvents = [
  closing('a', 'Deal Qualifié', A),
  closing('a', 'Deal Won', A),
  closing('a', 'Deal Won', A), // même lead, même statut : compté une fois
  closing('b', 'Deal Non Qualifié', B),
  closing('c', 'Deal Lost', C),
  closing('c', 'Proposal Sent', C),
  closing('d', 'Proposal Signed', D),
  closing('d', 'No-Show', D),
]
const latestClosingEvents = [closing('a', 'Deal Won', A), closing('b', 'Deal Non Qualifié', B), closing('c', 'Deal Lost', C), closing('d', 'No-Show', D)]

test('par campagne, chaque statut compte des leads distincts', () => {
  const rows = buildClosingBreakdown({ dimension: 'campaign', rdvEvents, closingEvents, latestClosingEvents })
  const cbo = rows.find((r) => r.name === 'CBO V5')
  assert.deepEqual(
    { rdv: cbo.rdv, noShow: cbo.noShow, dealQualified: cbo.dealQualified, dealNonQualified: cbo.dealNonQualified, dealWon: cbo.dealWon, dealLost: cbo.dealLost, proposalSent: cbo.proposalSent, proposalSigned: cbo.proposalSigned },
    { rdv: 3, noShow: 0, dealQualified: 1, dealNonQualified: 1, dealWon: 1, dealLost: 1, proposalSent: 1, proposalSigned: 0 }
  )
  const optin = rows.find((r) => r.name === 'OPTIN 2')
  assert.equal(optin.noShow, 1)
  assert.equal(optin.proposalSigned, 1)
})

test('un Deal Won compte aussi comme Deal Qualifié, comme sur les cartes de la page', () => {
  const rows = buildClosingBreakdown({
    dimension: 'campaign',
    rdvEvents: [A],
    closingEvents: [closing('a', 'Deal Won', A)],
    latestClosingEvents: [closing('a', 'Deal Won', A)],
  })
  assert.equal(rows[0].dealQualified, 1)
  assert.equal(rows[0].dealWon, 1)
})

test('le No-Show ne compte que si c est le dernier statut de la période', () => {
  const rows = buildClosingBreakdown({
    dimension: 'campaign',
    rdvEvents: [A],
    closingEvents: [closing('a', 'No-Show', A), closing('a', 'Deal', A)],
    latestClosingEvents: [closing('a', 'Deal', A)],
  })
  assert.equal(rows[0].noShow, 0)
})

test('par annonce, une même annonce dans deux campagnes donne deux lignes, avec sa campagne et son adset', () => {
  const rows = buildClosingBreakdown({ dimension: 'ad', rdvEvents, closingEvents, latestClosingEvents })
  const ad4 = rows.filter((r) => r.name === 'Ad 4')
  assert.equal(ad4.length, 2)
  assert.deepEqual(ad4.map((r) => r.parents).sort(), [['CBO V5', 'Adset 1'], ['OPTIN 2', 'Adset 9']])
  assert.equal(ad4.find((r) => r.parents[0] === 'CBO V5').rdv, 2)
})

test('par adset, les lignes sont regroupées par campagne et adset', () => {
  const rows = buildClosingBreakdown({ dimension: 'adset', rdvEvents, closingEvents, latestClosingEvents })
  assert.deepEqual(rows.map((r) => `${r.parents[0]} / ${r.name}`).sort(), ['CBO V5 / Adset 1', 'CBO V5 / Adset 2', 'OPTIN 2 / Adset 9'])
})

test('une dimension absente devient N/A', () => {
  const rows = buildClosingBreakdown({ dimension: 'adset', rdvEvents: [lead('x', null, null, null)], closingEvents: [], latestClosingEvents: [] })
  assert.equal(rows[0].name, 'N/A')
  assert.deepEqual(rows[0].parents, ['N/A'])
})

test('tri par Deal Won, puis Deal Qualifié, puis RDV ; taux de closing = Deal Won / RDV', () => {
  const rows = buildClosingBreakdown({ dimension: 'campaign', rdvEvents, closingEvents, latestClosingEvents })
  assert.deepEqual(rows.map((r) => r.name), ['CBO V5', 'OPTIN 2'])
  assert.equal(rows[0].closingRate, 100 / 3)
  const empty = buildClosingBreakdown({ dimension: 'campaign', rdvEvents: [], closingEvents: [closing('z', 'Deal Lost', lead('z', 'X'))], latestClosingEvents: [] })
  assert.equal(empty[0].closingRate, null)
})
