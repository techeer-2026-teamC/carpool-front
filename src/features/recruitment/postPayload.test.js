import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPostPayload } from './postPayload.js'

const form = {
  type: 'TAXI', origin: { name: '강남역', lat: 37.4979, lng: 127.0276 },
  destination: { name: '판교역', lat: 37.3943, lng: 127.111 },
  date: '2026-09-22', time: '08:00', capacity: '3', price: '', description: '정문에서 만나요.',
}

test('route titles fit the API limit without truncating either saved place', () => {
  for (const [origin, destination] of [['가'.repeat(50), '나'.repeat(50)], ['가'.repeat(100), '나'], ['가', '나'.repeat(100)], ['🚕'.repeat(50), '🌳'.repeat(50)]]) {
    const payload = buildPostPayload({ ...form, origin: { ...form.origin, name: origin }, destination: { ...form.destination, name: destination } })
    assert.ok(payload.title.length <= 100)
    assert.equal(payload.departureLocation, origin)
    assert.equal(payload.destinationLocation, destination)
    const [from, to] = payload.title.split(' → ')
    assert.ok(from && to, 'both ends of the route remain visible')
    assert.equal(payload.title.isWellFormed(), true)
  }
})

test('short routes and full location coordinates remain unchanged', () => {
  const payload = buildPostPayload(form)
  assert.equal(payload.title, '강남역 → 판교역')
  assert.equal(payload.departureLat, form.origin.lat)
  assert.equal(payload.destinationLng, form.destination.lng)
  assert.equal(payload.departureTime, '2026-09-22T08:00:00')
  assert.equal(payload.maxPassengers, 3)
})

test('clearing a contribution sends null while an explicit zero stays zero', () => {
  const post = { price: 5000, departureTime: '2026-09-22T08:00:31', tags: [{ id: 7 }] }
  assert.equal(buildPostPayload({ ...form, post, price: '' }).price, null)
  const payload = buildPostPayload({ ...form, post, frozen: true, price: '0' })
  assert.equal(payload.price, 0)
  assert.equal(payload.departureTime, post.departureTime)
  assert.deepEqual(payload.tagIds, [7])
})
