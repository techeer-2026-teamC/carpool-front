import { api } from './client'

export async function getMyDriver() {
  const res = await api.get('/drivers/me')
  return res.data
}

export async function registerDriver(vehicleOptionId, carNumber) {
  const res = await api.post('/drivers', { vehicleOptionId, carNumber })
  return res.data
}

export async function updateDriver(vehicleOptionId, carNumber) {
  const res = await api.put('/drivers', { vehicleOptionId, carNumber })
  return res.data
}

export async function deleteDriver() {
  await api.delete('/drivers')
}
