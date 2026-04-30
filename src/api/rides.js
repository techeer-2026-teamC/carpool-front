import { api } from './client'

export async function getMyRidesAsDriver() {
  const res = await api.get('/rides/me')
  return res.data
}

export async function getMyRidesAsPassenger() {
  const res = await api.get('/rides/me/passenger')
  return res.data
}

export async function getRide(rideId) {
  const res = await api.get(`/rides/${rideId}`)
  return res.data
}

export async function createRide(postId) {
  const res = await api.post('/rides', { postId })
  return res.data
}

export async function startRide(rideId) {
  const res = await api.post(`/rides/${rideId}/start`)
  return res.data
}

export async function completeRide(rideId) {
  const res = await api.post(`/rides/${rideId}/complete`)
  return res.data
}
