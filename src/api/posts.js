import { api } from './client'

export async function fetchPosts() {
  const res = await api.get('/posts')
  return res.data
}

export async function createPost(payload) {
  const res = await api.post('/posts', payload)
  return res.data
}

export async function removePost(id) {
  return api.delete(`/posts/${id}`)
}
