import { sameMember } from './tripContract.js'

export function visiblePositions(positions, { postId, memberId, hostId, participants }) {
  const now = Date.now()
  return (Array.isArray(positions) ? positions : []).filter(point => point && sameMember(point.postId, postId)
    && participants.some(person => sameMember(person.memberId, point.memberId))
    && (sameMember(memberId, hostId) || sameMember(point.memberId, hostId) || sameMember(point.memberId, memberId))
    && Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90
    && Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180
    && now - new Date(point.recordedAt).getTime() < 60000
    && new Date(point.recordedAt).getTime() <= now + 5000)
}

export function mergePosition(positions, incoming) {
  if (!incoming || incoming.memberId == null || !Number.isFinite(incoming.latitude)
    || !Number.isFinite(incoming.longitude) || !Number.isFinite(new Date(incoming.recordedAt).getTime())) return positions
  const current = positions.find(point => sameMember(point.memberId, incoming.memberId))
  if (current && new Date(current.recordedAt).getTime() >= new Date(incoming.recordedAt).getTime()) return positions
  return [...positions.filter(point => !sameMember(point.memberId, incoming.memberId)), incoming]
}
