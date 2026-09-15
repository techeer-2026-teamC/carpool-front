import test from 'node:test'
import assert from 'node:assert/strict'
import { createInbox, mergeNotifications } from './inbox.js'

const item = (id, readAt = null) => ({ notificationId: id, message: `알림 ${id}`, type: 'APPLICATION_ACCEPTED', referenceId: 1, readAt })
const flush = () => new Promise(resolve => setImmediate(resolve))
function fixture(ids = [3, 2, 1]) {
  let rows = ids.map(id => item(id)), changes = 0, patches = 0
  const paths = []
  const request = async (path, options) => {
    paths.push(path)
    if (options.method === 'PATCH') { patches++; rows = rows.map(row => path.includes(`/${row.notificationId}/`) ? { ...row, readAt: '2026-09-15T10:00:00' } : row); return null }
    if (path.endsWith('unread-count')) return { count: rows.filter(row => !row.readAt).length }
    const before = Number(new URL(path, 'https://moa.test').searchParams.get('beforeId')) || Infinity
    const selected = rows.filter(row => row.notificationId < before)
    const page = selected.slice(0, 20)
    return { items: page, hasNext: selected.length > 20, nextCursor: selected.length > 20 ? page.at(-1).notificationId : null }
  }
  const model = createInbox({ request, onChange: () => { changes++ } })
  return { model, paths, request, changes: () => changes, patches: () => patches,
    insert(ids) { rows = [...ids.map(id => item(id)), ...rows] } }
}
test('notificationId deduplication and monotonic read state survive stale outbox replay', async () => {
  const app = fixture(); await app.model.refresh()
  app.model.receive(item(3)); app.model.receive(item(4)); app.model.receive(item(4))
  assert.equal(app.model.snapshot().unreadCount, 4)
  assert.equal(app.model.snapshot().items.length, 4)
  await app.model.markRead(3)
  app.model.receive(item(3))
  assert.ok(app.model.snapshot().items.find(row => row.notificationId === 3).readAt)
  assert.equal(app.patches(), 1)
  await app.model.markRead(3); assert.equal(app.patches(), 1)
  assert.equal(mergeNotifications([item(1)], [{ notificationId: 'bad', message: 'bad' }]).length, 1)
  app.model.dispose()
})
test('reconnection bridges more than one missed page and preserves the older pagination cursor', async () => {
  const app = fixture(Array.from({ length: 45 }, (_, n) => 45 - n))
  await app.model.refresh(); await app.model.loadMore()
  assert.equal(app.model.snapshot().items.length, 40)
  app.insert(Array.from({ length: 30 }, (_, n) => 75 - n))
  await app.model.refresh()
  assert.equal(app.model.snapshot().items.length, 70)
  assert.equal(app.model.snapshot().unreadCount, 75)
  assert.ok(app.paths.includes('/notifications?size=20&beforeId=56'))
  await app.model.loadMore()
  assert.equal(app.model.snapshot().items.length, 75)
  assert.equal(app.model.snapshot().hasNext, false)
  app.model.dispose()
})
test('initial DB repair preserves a newer realtime event and uses the authoritative unread count', async () => {
  let resolvePage
  const model = createInbox({ onChange: () => {}, request: async path => path.includes('unread-count')
    ? { count: 2 } : new Promise(resolve => { resolvePage = resolve }) })
  const repair = model.refresh(); await flush()
  model.receive(item(2))
  resolvePage({ items: [item(1)], nextCursor: null, hasNext: false })
  await repair
  assert.deepEqual(model.snapshot().items.map(row => row.notificationId), [2, 1])
  assert.equal(model.snapshot().unreadCount, 2)
  model.dispose()
})
test('failed read remains unread, disposal aborts a pending request and suppresses late updates', async () => {
  let pending, signal, changed = 0
  const model = createInbox({ onChange: () => { changed++ }, request: async (path, options) => {
    if (options.method === 'PATCH') throw new Error('읽음 저장 실패')
    if (path.endsWith('unread-count')) return { count: 1 }
    signal = options.signal
    return new Promise(resolve => { pending = resolve })
  } })
  model.receive(item(1))
  await assert.rejects(model.markRead(1), /저장 실패/)
  assert.equal(model.snapshot().items[0].readAt, null)
  const repair = model.refresh(); await flush()
  model.dispose(); const before = changed
  pending({ items: [], nextCursor: null, hasNext: false }); await repair
  assert.ok(signal.aborted)
  assert.equal(changed, before)
})
test('an event before the first DB response cannot suppress the older inbox pages', async () => {
  const app = fixture(Array.from({ length: 25 }, (_, n) => 25 - n))
  app.model.receive(item(25))
  await app.model.refresh()
  assert.equal(app.model.snapshot().hasNext, true)
  await app.model.loadMore()
  assert.equal(app.model.snapshot().items.length, 25)
  app.model.dispose()
})

test('a live event received after a gap does not stop DB catch-up at that event', async () => {
  const app = fixture(Array.from({ length: 100 }, (_, n) => 100 - n))
  await app.model.refresh()
  app.insert(Array.from({ length: 51 }, (_, n) => 151 - n))
  app.model.receive(item(151))
  await app.model.refresh()
  const ids = app.model.snapshot().items.map(row => row.notificationId)
  for (let id = 81; id <= 151; id++) assert.ok(ids.includes(id), `missing ${id}`)
  assert.ok(app.paths.includes('/notifications?size=20&beforeId=112'))
  await app.model.loadMore()
  assert.ok(app.model.snapshot().items.some(row => row.notificationId === 61))
  app.model.dispose()
})
