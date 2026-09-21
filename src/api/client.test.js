import { beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { api, authorizedFetch, captureAuthorization, clearAuthorization, getAuthVersion, getToken, refreshAccessToken, setAccessToken, syncExternalAuthorization } from './client.js'

const storage = new Map()
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }
globalThis.window = new EventTarget()
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }
const token = (memberId, revision, token_use = 'access') => `header.${btoa(JSON.stringify({ memberId, revision, token_use }))}.signature`
const oldToken = token(1, 1)
const freshToken = token(1, 2)
beforeEach(() => { clearAuthorization(); setAccessToken(oldToken) })

test('simultaneous refresh calls share one request', async () => {
  const gate = deferred()
  let calls = 0
  globalThis.fetch = async () => { calls++; return gate.promise }
  const first = refreshAccessToken()
  const second = refreshAccessToken()
  await Promise.resolve()
  gate.resolve(json({ data: { accessToken: freshToken } }))
  assert.deepEqual(await Promise.all([first, second]), [freshToken, freshToken])
  assert.equal(calls, 1)
})

test('late refresh response cannot restore a logged out session', async () => {
  const gate = deferred()
  globalThis.fetch = async () => gate.promise
  const pending = refreshAccessToken()
  await Promise.resolve()
  clearAuthorization()
  gate.resolve(json({ data: { accessToken: 'late-token' } }))
  await assert.rejects(pending, { name: 'AbortError' })
  assert.equal(getToken(), null)
})

test('late refresh cannot overwrite a newly logged in account', async () => {
  const gate = deferred()
  globalThis.fetch = async () => gate.promise
  const pending = refreshAccessToken()
  await Promise.resolve()
  setAccessToken('different-account')
  gate.resolve(json({ data: { accessToken: 'late-token' } }))
  await assert.rejects(pending, { name: 'AbortError' })
  assert.equal(getToken(), 'different-account')
})

test('401 refreshes once and replays with the replacement bearer token', async () => {
  const seen = []
  globalThis.fetch = async (url, options) => {
    seen.push([url, options.headers?.Authorization])
    if (url.endsWith('/auth/refresh')) return json({ data: { accessToken: freshToken } })
    return options.headers.Authorization === `Bearer ${oldToken}` ? json({}, 401) : json({ data: 'ok' })
  }
  assert.equal((await api.get('/members/me')).data, 'ok')
  assert.equal(seen.length, 3)
  assert.equal(seen[2][1], `Bearer ${freshToken}`)
})

test('Redis 503 during refresh preserves session and exposes retryable status', async () => {
  globalThis.fetch = async url => json({}, url.endsWith('/auth/refresh') ? 503 : 401)
  await assert.rejects(api.get('/members/me'), { status: 503 })
  assert.equal(getToken(), oldToken)
})

test('invalid refresh credentials clear the rejected session', async () => {
  globalThis.fetch = async () => json({}, 401)
  await assert.rejects(api.get('/members/me'), { status: 401 })
  assert.equal(getToken(), null)
})

test('login never sends a stale bearer token', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(options.headers.Authorization, undefined)
    assert.equal(options.credentials, 'include')
    return json({ data: {} })
  }
  await api.post('/auth/login', { email: 'test@example.test', password: 'test-only' })
})

test('aborted caller is not replayed after token refresh', async () => {
  const abort = new AbortController()
  let requests = 0
  globalThis.fetch = async url => {
    if (url.endsWith('/auth/refresh')) { abort.abort(); return json({ data: { accessToken: freshToken } }) }
    requests++; return json({}, 401)
  }
  await assert.rejects(authorizedFetch('/members/me', { signal: abort.signal }), { name: 'AbortError' })
  assert.equal(requests, 1)
})

test('a refresh lock wait never replays an account A mutation as account B', async () => {
  const gate = deferred()
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: async (_name, _options, callback) => { await gate.promise; return callback() } } })
  let requests = 0
  globalThis.fetch = async () => { requests++; return json({}, 401) }
  try {
    const pending = api.post('/posts/10/applications')
    await new Promise(resolve => setImmediate(resolve))
    localStorage.setItem('accessToken', token(2, 1))
    gate.resolve()
    await assert.rejects(pending, { name: 'AbortError' })
    assert.equal(requests, 1)
  } finally { delete navigator.locks }
})

test('same-account refresh in another tab reuses its token without rotating twice', async () => {
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: async (_name, _options, callback) => { localStorage.setItem('accessToken', freshToken); return callback() } } })
  let requests = 0
  globalThis.fetch = async (_url, options) => { requests++; return options.headers.Authorization === `Bearer ${oldToken}` ? json({}, 401) : json({ data: 'ok' }) }
  try { assert.equal((await api.get('/members/me')).data, 'ok'); assert.equal(requests, 2) }
  finally { delete navigator.locks }
})

test('normal token rotation preserves a request guard while explicit login invalidates it', async () => {
  const valid = captureAuthorization(), version = getAuthVersion()
  globalThis.fetch = async () => json({ data: { accessToken: freshToken } })
  await refreshAccessToken()
  assert.equal(getAuthVersion(), version)
  assert.equal(valid(), true)
  setAccessToken(token(1, 3))
  assert.equal(valid(), false)
})

test('external account changes invalidate pending work but same-account rotation does not', () => {
  const valid = captureAuthorization(), version = getAuthVersion()
  localStorage.setItem('accessToken', freshToken)
  assert.equal(syncExternalAuthorization({ key: 'accessToken', oldValue: oldToken, newValue: freshToken }), false)
  assert.equal(getAuthVersion(), version)
  assert.equal(valid(), true)
  const other = token(2, 1)
  localStorage.setItem('accessToken', other)
  assert.equal(syncExternalAuthorization({ key: 'accessToken', oldValue: freshToken, newValue: other }), true)
  assert.equal(valid(), false)
})

test('a successful late withdrawal response cannot clear the replacement account', async () => {
  const gate = deferred(), valid = captureAuthorization()
  globalThis.fetch = async () => gate.promise
  const pending = api.delete('/members/me').then(() => { if (valid()) clearAuthorization() })
  const other = token(2, 1)
  setAccessToken(other)
  gate.resolve(json({ data: null }))
  await assert.rejects(pending, { name: 'AbortError' })
  assert.equal(getToken(), other)
})

test('a late logout finalizer is rejected after another account logs in', async () => {
  const gate = deferred(), valid = captureAuthorization()
  globalThis.fetch = async () => gate.promise
  const pending = api.post('/auth/logout').finally(() => { if (valid()) clearAuthorization() })
  setAccessToken(token(2, 1))
  gate.resolve(json({ data: null }))
  await assert.rejects(pending, { name: 'AbortError' })
  assert.equal(getToken(), token(2, 1))
})

test('account replacement during login response decoding prevents the stale login callback', async () => {
  clearAuthorization()
  const gate = deferred()
  globalThis.fetch = async () => ({ ok: true, status: 200, json: () => gate.promise })
  const pending = api.post('/auth/login', { email: 'a@test.com' }).then(body => setAccessToken(body.data.accessToken))
  await new Promise(resolve => setImmediate(resolve))
  setAccessToken(token(2, 1))
  gate.resolve({ data: { accessToken: oldToken } })
  await assert.rejects(pending, { name: 'AbortError' })
  assert.equal(getToken(), token(2, 1))
})

test('unmounted login caller forwards abort and cannot consume a late response', async () => {
  const gate = deferred(), abort = new AbortController()
  globalThis.fetch = async (_url, options) => { assert.equal(options.signal, abort.signal); return gate.promise }
  const pending = api.post('/auth/login', {}, { signal: abort.signal })
  abort.abort(); gate.resolve(json({ data: { accessToken: freshToken } }))
  await assert.rejects(pending, { name: 'AbortError' })
  assert.equal(getToken(), oldToken)
})

test('refresh cannot store or announce an access token belonging to the cookie account instead of the current account', async () => {
  let announced = 0, loggedOut = 0
  const announcedToken = () => { announced++ }, logout = () => { loggedOut++ }
  window.addEventListener('auth:token', announcedToken)
  window.addEventListener('auth:logout', logout)
  globalThis.fetch = async () => json({ data: { accessToken: token(2, 1) } })
  try {
    await assert.rejects(refreshAccessToken(), { status: 401 })
    assert.equal(getToken(), null)
    assert.equal(announced, 0)
    assert.equal(loggedOut, 1)
  } finally { window.removeEventListener('auth:token', announcedToken); window.removeEventListener('auth:logout', logout) }
})

test('refresh rejects a same-member refresh-purpose token before storing it', async () => {
  globalThis.fetch = async () => json({ data: { accessToken: token(1, 2, 'refresh') } })
  await assert.rejects(refreshAccessToken(), { status: 401 })
  assert.equal(getToken(), null)
})

test('unrecognized original token requires login without consulting the refresh cookie', async () => {
  setAccessToken('legacy-or-malformed-token')
  let requests = 0
  globalThis.fetch = async () => { requests++; return json({ data: { accessToken: freshToken } }) }
  await assert.rejects(refreshAccessToken(), { status: 401 })
  assert.equal(requests, 0)
  assert.equal(getToken(), null)
})

test('a delayed sibling 401 reuses a completed same-session refresh instead of failing or rotating again', async () => {
  const late = deferred(), seen = []
  globalThis.fetch = async (url, options) => {
    seen.push([url, options.headers?.Authorization])
    if (url.endsWith('/auth/refresh')) return json({ data: { accessToken: freshToken } })
    if (url.endsWith('/late') && options.headers.Authorization === `Bearer ${oldToken}`) return late.promise
    return options.headers.Authorization === `Bearer ${oldToken}` ? json({}, 401) : json({ data: 'ok' })
  }
  const pending = api.get('/late')
  assert.equal((await api.get('/early')).data, 'ok')
  late.resolve(json({}, 401))
  assert.equal((await pending).data, 'ok')
  assert.equal(seen.filter(([url]) => url.endsWith('/auth/refresh')).length, 1)
  assert.deepEqual(seen.at(-1), [`${'/api/v1'}/late`, `Bearer ${freshToken}`])
})
