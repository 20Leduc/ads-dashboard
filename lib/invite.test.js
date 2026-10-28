import test from 'node:test'
import assert from 'node:assert/strict'

import { emailMatchesHint, inviteStatusMessage, isInviteCode } from './invite.js'

test('an invite code is 32 lowercase hex characters', () => {
  assert.equal(isInviteCode('0123456789abcdef0123456789abcdef'), true)
  assert.equal(isInviteCode('0123456789ABCDEF0123456789abcdef'), false)
  assert.equal(isInviteCode('abc'), false)
  assert.equal(isInviteCode(undefined), false)
})

test('the typed email must match the masked email of the invite', () => {
  assert.equal(emailMatchesHint('Ludivine@Gmail.com ', 'l***@gmail.com'), true)
  assert.equal(emailMatchesHint('marc@gmail.com', 'l***@gmail.com'), false)
  assert.equal(emailMatchesHint('ludivine@learnim.fr', 'l***@gmail.com'), false)
  assert.equal(emailMatchesHint('pas-un-email', 'l***@gmail.com'), false)
})

test('each invite status has a message naming the client', () => {
  assert.match(inviteStatusMessage('expired', 'LEARNIM'), /expiré/)
  assert.match(inviteStatusMessage('accepted', 'LEARNIM'), /déjà été utilisée/)
  assert.match(inviteStatusMessage('revoked', 'LEARNIM'), /désactivée/)
  assert.match(inviteStatusMessage('missing'), /introuvable/)
  assert.equal(inviteStatusMessage('valid', 'LEARNIM'), null)
})
