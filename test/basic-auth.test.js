import test from 'node:test'
import assert from 'node:assert/strict'
import { hasValidBasicAuth } from '../lib/basic-auth.js'

function basic(value) {
  return `Basic ${Buffer.from(value).toString('base64')}`
}

test('accepts configured credentials, including colons in the password', () => {
  assert.equal(hasValidBasicAuth(basic('owner:secret:part'), 'owner', 'secret:part'), true)
})

test('rejects missing, malformed, and incorrect credentials', () => {
  assert.equal(hasValidBasicAuth(null, 'owner', 'secret'), false)
  assert.equal(hasValidBasicAuth('Bearer token', 'owner', 'secret'), false)
  assert.equal(hasValidBasicAuth(basic('owner:wrong'), 'owner', 'secret'), false)
  assert.equal(hasValidBasicAuth(basic('owner:secret'), '', 'secret'), false)
})
