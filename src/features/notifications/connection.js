import { consumeSse } from './sse.js'

export function startNotificationStream({ request, refreshToken, getToken, onNotification,
  onRepair, onStatus, onLogout = () => {}, doc = document, events = window,
  clock = { setTimeout: (...args) => setTimeout(...args), clearTimeout: timer => clearTimeout(timer), now: Date.now }, random = Math.random }) {
  let disposed = false, generation = 0, controller, retry, repairTimer, tokenTimer, attempts = 0
  let lastRefresh = clock.now(), refreshing = false
  const active = () => !disposed && !doc.hidden && Boolean(getToken())
  const repair = () => { if (active()) void Promise.resolve(onRepair()).catch(() => {}) }
  function suspend() {
    generation++
    controller?.abort(); controller = null
    for (const timer of [retry, repairTimer, tokenTimer]) clock.clearTimeout(timer)
    retry = repairTimer = tokenTimer = null
  }
  async function connect() {
    if (!active() || controller) return
    const current = ++generation
    const connection = new AbortController()
    controller = connection
    onStatus('connecting')
    try {
      const response = await request('/notifications/subscribe', {
        signal: connection.signal, headers: { Accept: 'text/event-stream' }, cache: 'no-store',
      })
      if (current !== generation || !active()) { await response.body?.cancel(); return }
      onStatus('live'); repair()
      await consumeSse(response, event => {
        if (current !== generation) return
        attempts = 0
        if (event.type !== 'notification') return
        try {
          const payload = JSON.parse(event.data)
          if (payload.notificationId != null && (!event.id || String(payload.notificationId) === event.id)) onNotification(payload)
        } catch { /* A malformed event is repaired from the DB inbox. */ }
      }, connection.signal)
    } catch { /* Inbox polling continues while the stream reconnects. */ }
    finally {
      if (current === generation) {
        controller = null
        if (active()) {
          onStatus('reconnecting')
          const delay = Math.min(30000, 1000 * 2 ** Math.min(attempts++, 5))
          retry = clock.setTimeout(() => { retry = null; void connect() }, Math.min(30000, delay * (1 + random() / 5)))
        }
      }
    }
  }
  function scheduleRepair() {
    repairTimer = clock.setTimeout(() => { repair(); if (active()) scheduleRepair() }, 30000)
  }
  function scheduleRefresh() {
    if (refreshing) return
    tokenTimer = clock.setTimeout(async () => {
      tokenTimer = null
      if (!active()) return
      const current = generation
      refreshing = true
      try {
        await refreshToken()
        lastRefresh = clock.now()
      } catch {
        lastRefresh = clock.now() - 270000 // Retry in 30 seconds, without a tight loop.
      } finally {
        refreshing = false
        if (active() && current === generation) { suspend(); resume() }
        else if (active() && tokenTimer == null) scheduleRefresh()
      }
    }, Math.max(0, 300000 - (clock.now() - lastRefresh)))
  }
  function resume() {
    if (!active()) return
    repair()
    if (!controller && !retry) void connect()
    if (repairTimer == null) scheduleRepair()
    if (tokenTimer == null) scheduleRefresh()
  }
  function visibility() {
    if (doc.hidden) { suspend(); onStatus('paused') }
    else resume()
  }
  function storage(event) {
    if (event.key !== 'accessToken' && event.key !== null) return
    if (!getToken()) logout()
    else { suspend(); resume() }
  }
  function logout() { dispose(); onLogout() }
  function dispose() {
    if (disposed) return
    disposed = true; suspend(); onStatus('idle')
    doc.removeEventListener('visibilitychange', visibility)
    events.removeEventListener('focus', resume)
    events.removeEventListener('storage', storage)
    events.removeEventListener('auth:logout', logout)
  }
  doc.addEventListener('visibilitychange', visibility)
  events.addEventListener('focus', resume)
  events.addEventListener('storage', storage)
  events.addEventListener('auth:logout', logout)
  if (active()) resume()
  else onStatus('paused')
  return dispose
}
