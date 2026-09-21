import test from 'node:test'
import assert from 'node:assert/strict'
import { createSseParser, consumeSse } from './sse.js'
import { startNotificationStream } from './connection.js'

const flush = () => new Promise(resolve => setImmediate(resolve))
const encode = value => new TextEncoder().encode(value)
test('SSE preserves split UTF-8, CRLF, comments, multiple data lines and complete frames only', () => {
  const events = [], parse = createSseParser(event => events.push(event))
  const bytes = encode(': keepalive\r\nid: 7\r\nevent: notification\r\ndata: 안녕\r\ndata: 모아\r\n\r\ndata: unfinished')
  for (const byte of bytes) parse(new Uint8Array([byte]))
  assert.deepEqual(events, [{ id: '7', type: 'notification', data: '안녕\n모아' }])
  assert.throws(() => createSseParser(() => {}, 4)(encode('data: too large')), /너무 큽니다/)
})
test('stream abort cancels a pending reader and rejects a non-SSE response', async () => {
  let cancelled = 0
  const response = new Response(new ReadableStream({ cancel() { cancelled++ } }), { headers: { 'content-type': 'text/event-stream' } })
  const controller = new AbortController()
  const reading = consumeSse(response, () => assert.fail('unexpected frame'), controller.signal)
  controller.abort(); await reading
  assert.equal(cancelled, 1)
  assert.equal(response.body.locked, false)
  await assert.rejects(consumeSse(new Response('{}'), () => {}, new AbortController().signal), /연결/)
})

function fixture(overrides = {}) {
  let now = 0, next = 0, token = 'token', repairs = 0, refreshed = 0
  const tasks = new Map(), sockets = [], statuses = [], received = []
  const doc = new EventTarget(), events = new EventTarget()
  doc.hidden = false
  const clock = { now: () => now, clearTimeout: id => tasks.delete(id),
    setTimeout: (fn, delay) => { tasks.set(++next, { fn, at: now + delay }); return next } }
  const request = async (_path, options) => {
    const socket = { signal: options.signal, cancelled: false }
    sockets.push(socket)
    return new Response(new ReadableStream({ start(controller) { socket.push = text => controller.enqueue(encode(text)); socket.end = () => controller.close() },
      cancel() { socket.cancelled = true } }), { headers: { 'content-type': 'text/event-stream' } })
  }
  const stop = startNotificationStream({ request, refreshToken: async () => { refreshed++ }, getToken: () => token,
    onRepair: () => { repairs++ }, onNotification: item => received.push(item), onStatus: status => statuses.push(status),
    doc, events, clock, random: () => 0, ...overrides })
  return { doc, events, sockets, tasks, statuses, received, stop, repairs: () => repairs, refreshed: () => refreshed,
    logout() { token = null; events.dispatchEvent(new Event('auth:logout')) },
    async advance(ms) {
      now += ms
      for (const [id, task] of [...tasks]) if (task.at <= now) { tasks.delete(id); task.fn() }
      await flush()
    },
    async visible(value) { doc.hidden = !value; doc.dispatchEvent(new Event('visibilitychange')); await flush() } }
}
test('hidden tabs abort, returning tabs repair, logout and unmount leave no connection or timer', async () => {
  const app = fixture(); await flush()
  assert.equal(app.sockets.length, 1)
  assert.ok(app.repairs() >= 1)
  await app.visible(false)
  assert.ok(app.sockets[0].signal.aborted && app.sockets[0].cancelled)
  assert.equal(app.tasks.size, 0)
  const repairs = app.repairs()
  await app.advance(30000)
  assert.equal(app.repairs(), repairs)
  await app.visible(true)
  assert.equal(app.sockets.length, 2)
  assert.ok(app.repairs() > repairs)
  app.logout(); await flush()
  assert.ok(app.sockets[1].cancelled)
  assert.equal(app.tasks.size, 0)
  app.events.dispatchEvent(new Event('focus')); await app.advance(300000)
  assert.equal(app.sockets.length, 2)
  app.stop()
})
test('EOF backs off, malformed events are isolated, active inbox polling and five-minute renewal continue', async () => {
  const app = fixture(); await flush()
  app.sockets[0].push('event: notification\ndata: broken\n\nevent: notification\nid: 9\ndata: {"notificationId":9}\n\n')
  await flush(); assert.equal(app.received.length, 1)
  app.sockets[0].end(); await flush()
  assert.equal(app.statuses.at(-1), 'reconnecting')
  await app.advance(999); assert.equal(app.sockets.length, 1)
  await app.advance(1); assert.equal(app.sockets.length, 2)
  const before = app.repairs()
  await app.advance(29000); assert.ok(app.repairs() > before)
  await app.advance(270000)
  assert.equal(app.refreshed(), 1)
  assert.equal(app.sockets.length, 3)
  app.stop(); await flush()
  assert.equal(app.tasks.size, 0)
  assert.ok(app.sockets.at(-1).cancelled)
})
test('stopped request cannot open a late stream or schedule reconnection', async () => {
  let resolve, cancelled = 0
  const app = fixture({ request: () => new Promise(done => { resolve = done }) })
  app.stop()
  resolve(new Response(new ReadableStream({ cancel() { cancelled++ } }), { headers: { 'content-type': 'text/event-stream' } }))
  await flush()
  assert.equal(cancelled, 1)
  assert.equal(app.tasks.size, 0)
})
test('repeated failures back off up to 30 seconds and focus does not duplicate a pending retry', async () => {
  let calls = 0
  const app = fixture({ request: async () => { calls++; throw new Error('unavailable') } })
  await flush()
  for (const delay of [1000, 2000, 4000, 8000, 16000, 30000, 30000]) {
    const before = calls
    app.events.dispatchEvent(new Event('focus'))
    await app.advance(delay - 1); assert.equal(calls, before)
    await app.advance(1); assert.equal(calls, before + 1)
  }
  app.stop(); assert.equal(app.tasks.size, 0)
})
test('finishing a token refresh after logout cannot restart the notification session', async () => {
  let finish
  const app = fixture({ refreshToken: () => new Promise(resolve => { finish = resolve }) })
  await flush(); await app.advance(300000)
  app.logout(); finish('new-token'); await flush()
  assert.equal(app.sockets.length, 1)
  assert.equal(app.tasks.size, 0)
})
