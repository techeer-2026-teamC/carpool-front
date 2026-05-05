import { api } from './client'

export async function getVehicleModels() {
  const res = await api.get('/vehicles/models')
  return res.data
}

export async function getVehicleColors(brand, model) {
  const res = await api.get(`/vehicles/colors?brand=${encodeURIComponent(brand)}&model=${encodeURIComponent(model)}`)
  return res.data
}
