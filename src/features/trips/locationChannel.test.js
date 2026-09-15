import test from 'node:test'
import assert from 'node:assert/strict'
import { setImmediate as turn } from 'node:timers/promises'
import { openLocationChannel } from './locationChannel.js'

const jwt = (memberId, nonce) => `header.${Buffer.from(JSON.stringify({ memberId, token_use: 'access', exp: Math.floor(Date.now() / 1000) + 120, nonce })).toString('base64url')}.signature`
async function until(predicate) {
  for (let attempt = 0; attempt < 100; attempt++) { if (predicate()) return; await turn() }
  assert.ok(predicate(), 'expected asynchronous lifecycle event')
}
function environment() {
  const original = new Map(['window', 'navigator', 'localStorage', 'WebSocket', 'fetch'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  let token = jwt(7, 'original')
  const calls = { watched: [], cleared: [], requests: [], sockets: [], errors: [], statuses: [] }
  const browser = new EventTarget()
  browser.location = { origin: 'http://localhost' }
  class Socket {
    readyState = 0
    constructor() {
      calls.sockets.push(this)
      queueMicrotask(() => { this.readyState = 1; this.onopen?.({}) })
    }
    send(frame) {
      if (String(frame).startsWith('CONNECT')) queueMicrotask(() => this.onmessage?.({ data: 'CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\0' }))
    }
    close() { this.readyState = 3; queueMicrotask(() => this.onclose?.({ code: 1000 })) }
  }
  const values = {
    window: browser, WebSocket: Socket,
    localStorage: { getItem: () => token },
    navigator: { geolocation: { watchPosition: callback => { calls.watched.push(callback); return 17 }, clearWatch: id => calls.cleared.push(id) } },
    fetch: async (url, options) => { calls.requests.push({ url, options }); return { ok: true } },
  }
  for (const [key, value] of Object.entries(values)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true })
  return {
    calls, originalToken: token,
    changeToken: value => { token = value; browser.dispatchEvent(new Event('auth:token')) },
    open: simulator => openLocationChannel({ postId: 42, memberId: 7, simulator,
      onPosition: () => {}, onStatus: state => calls.statuses.push(state), onError: message => calls.errors.push(message) }),
    restore: () => { for (const [key, descriptor] of original) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key] } },
  }
}

test('GPS starts only after authenticated connection and repeated stop clears it once', async () => {
  const env = environment()
  let channel
  try {
    channel = env.open(false)
    assert.equal(env.calls.watched.length, 0)
    await until(() => env.calls.watched.length === 1)
    await Promise.all([channel.stop(), channel.stop()])
    assert.deepEqual(env.calls.cleared, [17])
    assert.equal(env.calls.sockets[0].readyState, 3)
    assert.equal(env.calls.requests.length, 1)
    assert.equal(env.calls.errors.length, 0)
  } finally { await channel?.stop(); env.restore() }
})

test('same-account token refresh stops GPS and cleans up with the new token', async () => {
  const env = environment()
  let channel
  try {
    channel = env.open(false)
    await until(() => env.calls.watched.length === 1)
    const renewed = jwt(7, 'renewed')
    env.changeToken(renewed)
    await until(() => env.calls.errors.length === 1)
    assert.deepEqual(env.calls.cleared, [17])
    assert.equal(env.calls.requests[0].options.headers.Authorization, `Bearer ${renewed}`)
    assert.equal(env.calls.sockets.length, 1, 'reconnection requires fresh consent')
  } finally { await channel?.stop(); env.restore() }
})

test('switching accounts never replays cleanup as the new user; simulator reads no GPS', async () => {
  const env = environment()
  let channel
  try {
    channel = env.open(true)
    await until(() => env.calls.statuses.includes('connected'))
    assert.equal(env.calls.watched.length, 0)
    env.changeToken(jwt(8, 'different-account'))
    await until(() => env.calls.errors.length === 1)
    assert.equal(env.calls.requests[0].options.headers.Authorization, `Bearer ${env.originalToken}`)
    assert.equal(env.calls.sockets[0].readyState, 3)
  } finally { await channel?.stop(); env.restore() }
})
