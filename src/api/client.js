const BASE = '/api/v1'

function getToken() {
  return localStorage.getItem('accessToken')
}

function setToken(token) {
  localStorage.setItem('accessToken', token)
}

function clearToken() {
  localStorage.removeItem('accessToken')
}

let isRefreshing = false

async function tryRefresh() {
  const res = await fetch(`${BASE}/auth/refresh`, { method: 'POST' })
  if (!res.ok) throw new Error('refresh failed')
  const body = await res.json()
  setToken(body.data.accessToken)
}

async function request(path, options = {}, retry = true) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }
  const res = await fetch(`${BASE}${path}`, { ...options, headers })

  if (res.status === 401 && retry && !isRefreshing) {
    isRefreshing = true
    try {
      await tryRefresh()
      isRefreshing = false
      return request(path, options, false)
    } catch {
      isRefreshing = false
      clearToken()
      window.location.reload()
      return
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const err = new Error(body.message || `HTTP ${res.status}`)
    err.status = res.status
    err.body = body
    throw err
  }
  return res.json()
}

export const api = {
  get:    (path)        => request(path),
  post:   (path, body)  => request(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (path, body)  => request(path, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: (path)        => request(path, { method: 'DELETE' }),
}
