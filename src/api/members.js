import { api } from './client'

export async function getMyProfile() {
  const res = await api.get('/members/me')
  return res.data
}

export async function updateProfile({ nickname, currentPassword, newPassword }) {
  const body = {}
  if (nickname !== undefined) body.nickname = nickname
  if (currentPassword !== undefined) body.currentPassword = currentPassword
  if (newPassword !== undefined) body.newPassword = newPassword
  const res = await api.put('/members/me', body)
  return res.data
}
