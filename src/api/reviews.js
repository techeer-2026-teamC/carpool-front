import { api } from './client'

export async function submitReview(rideId, rating, comment) {
  const res = await api.post('/reviews', { rideId, rating, comment })
  return res.data
}

export async function getMyReviewForRide(rideId) {
  const res = await api.get(`/reviews/ride/${rideId}/me`)
  return res.data
}

export async function getDriverRating(driverId) {
  const res = await api.get(`/reviews/driver/${driverId}/rating`)
  return res.data
}
