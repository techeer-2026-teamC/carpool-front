import test, { afterEach, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { visiblePositions, mergePosition } from './locationState.js'

const now = Date.parse('2026-09-15T03:00:00Z')
beforeEach(() => mock.method(Date, 'now', () => now))
afterEach(() => mock.restoreAll())
const scope = { postId: 42, memberId: 7, hostId: 1, participants: [{ memberId: 1 }, { memberId: 7 }, { memberId: 8 }] }
const point = (memberId, age = 0) => ({ postId: 42, memberId, latitude: 37.5, longitude: 127, recordedAt: new Date(now - age).toISOString() })

test('participant sees host and self; host sees current participants only', () => {
  const positions = [point(1), point(7), point(8), point(9)]
  assert.deepEqual(visiblePositions(positions, scope, now).map(item => item.memberId), [1, 7])
  assert.deepEqual(visiblePositions(positions, { ...scope, memberId: 1 }, now).map(item => item.memberId), [1, 7, 8])
  assert.deepEqual(visiblePositions(positions, { ...scope, participants: [{ memberId: 1 }] }, now).map(item => item.memberId), [1])
})

test('expired, future, unrelated and malformed coordinates cannot remain visible', () => {
  const positions = [point(1, 59999), point(7, 60000), point(1, -6000),
    { ...point(1), postId: 99 }, { ...point(1), latitude: Infinity },
    { ...point(1), longitude: 181 }, { ...point(1), recordedAt: 'invalid' }, null]
  assert.deepEqual(visiblePositions(positions, scope, now), [positions[0]])
  assert.deepEqual(visiblePositions({}, scope, now), [])
})

test('duplicate and delayed transport events never overwrite a newer position', () => {
  const current = [point(7)]
  assert.strictEqual(mergePosition(current, point(7, 1000)), current)
  assert.strictEqual(mergePosition(current, point(7)), current)
  const next = point(7, -1000)
  assert.deepEqual(mergePosition(current, next), [next])
  assert.deepEqual(mergePosition(current, point(1)), [...current, point(1)])
})

test('malformed live messages cannot break the position state update', () => {
  const current = [point(7)]
  for (const value of [null, undefined, {}, { ...point(7), recordedAt: 'invalid' }]) {
    assert.strictEqual(mergePosition(current, value), current)
  }
})

test('a caller clock from the previous render cannot hide a newly received position', () => {
  const received = point(1, -12000)
  Date.now.mock.mockImplementation(() => now + 12000)
  assert.deepEqual(visiblePositions([received], scope, now), [received])
  Date.now.mock.mockImplementation(() => now + 72000)
  assert.deepEqual(visiblePositions([received], scope, now), [])
})
