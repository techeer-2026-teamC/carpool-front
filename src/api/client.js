export const API_BASE = `${import.meta.env?.VITE_API_BASE ?? ''}/api/v1`
export const getToken = () => localStorage.getItem('accessToken')
let sessionVersion = 0
let refreshTask = null
export const getAuthVersion = () => sessionVersion

function tokenMember(token) {
  try {
    const claims = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return claims.token_use === 'access' && /^[1-9]\d*$/.test(String(claims.memberId)) ? claims.memberId : null
  }
  catch { return null }
}

function sameAccount(first, second) {
  const member = tokenMember(first)
  return first === second || (member != null && String(member) === String(tokenMember(second)))
}

function changeSession() {
  sessionVersion++
  refreshTask?.controller.abort()
  refreshTask = null
}

export function captureAuthorization() {
  const version = sessionVersion, token = getToken()
  return () => version === sessionVersion && sameAccount(token, getToken())
}

export function syncExternalAuthorization(event) {
  if (event.key !== 'accessToken' && event.key !== null) return false
  const changed = event.key === null || !sameAccount(event.oldValue, event.newValue)
  if (changed) changeSession()
  return changed
}

function storeAccessToken(token) {
  localStorage.setItem('accessToken', token)
  window.dispatchEvent(new Event('auth:token'))
}

export function setAccessToken(token) {
  changeSession()
  storeAccessToken(token)
}

export function clearAuthorization() {
  changeSession()
  localStorage.removeItem('accessToken')
  window.dispatchEvent(new Event('auth:logout'))
}

async function responseError(response) {
  const body = await response.json().catch(() => ({}))
  const error = new Error(body.message || (response.status === 503
    ? '잠시 연결할 수 없습니다. 다시 시도해 주세요.'
    : `요청을 처리하지 못했습니다. (${response.status})`))
  error.status = response.status
  error.body = body
  return error
}

function invalidRefreshSession() {
  clearAuthorization()
  const error = new Error('로그인 정보를 확인할 수 없습니다. 다시 로그인해 주세요.')
  error.status = 401
  return error
}

export function refreshAccessToken() {
  if (refreshTask) return refreshTask.promise
  const version = sessionVersion
  const originalToken = getToken()
  const task = { controller: new AbortController() }
  const refresh = async () => {
    if (version !== sessionVersion || task.controller.signal.aborted) {
      throw new DOMException('로그인 상태가 변경되었습니다.', 'AbortError')
    }
    // Another tab may already have rotated the shared refresh cookie.
    if (getToken() !== originalToken) {
      if (getToken() && sameAccount(originalToken, getToken())) return getToken()
      throw new DOMException('로그아웃되었습니다.', 'AbortError')
    }
    // An unknown/legacy source identity must reauthenticate, not adopt the cookie's account.
    if (tokenMember(originalToken) == null) throw invalidRefreshSession()
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST', credentials: 'include', signal: task.controller.signal,
    })
    if (!response.ok) throw await responseError(response)
    const body = await response.json()
    if (version !== sessionVersion || getToken() !== originalToken) {
      throw new DOMException('로그인 상태가 변경되었습니다.', 'AbortError')
    }
    const nextToken = body?.data?.accessToken
    if (tokenMember(nextToken) == null || !sameAccount(originalToken, nextToken)) throw invalidRefreshSession()
    storeAccessToken(nextToken)
    return nextToken
  }
  task.promise = Promise.resolve().then(() => globalThis.navigator?.locks
    ? navigator.locks.request('moa-refresh', { signal: task.controller.signal }, refresh)
    : refresh()).finally(() => { if (refreshTask === task) refreshTask = null })
  refreshTask = task
  return task.promise
}

export async function authorizedFetch(path, options = {}, retry = true) {
  const isCurrent = captureAuthorization()
  const token = /^\/auth\/(login|signup)$/.test(path) ? null : getToken()
  const response = await fetch(`${API_BASE}${path}`, {
    ...options, credentials: 'include',
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  })
  if (!isCurrent() || options.signal?.aborted) {
    await response.body?.cancel()
    throw new DOMException('로그인 상태가 변경되었거나 요청이 취소되었습니다.', 'AbortError')
  }
  if (response.status === 401 && retry && token) {
    // A sibling request may already have rotated this same session while this 401 was in flight.
    if (getToken() !== token) return authorizedFetch(path, options, false)
    try { await refreshAccessToken() }
    catch (error) {
      if (error.status === 401 && getToken() === token) clearAuthorization()
      throw error
    }
    if (!sameAccount(token, getToken())) throw new DOMException('로그인 계정이 변경되었습니다.', 'AbortError')
    if (options.signal?.aborted) throw new DOMException('요청이 취소되었습니다.', 'AbortError')
    return authorizedFetch(path, options, false)
  }
  if (!response.ok) throw await responseError(response)
  return response
}

async function request(path, options) {
  const isCurrent = captureAuthorization()
  const response = await authorizedFetch(path, options)
  const body = response.status === 204 ? {} : await response.json()
  if (!isCurrent() || options?.signal?.aborted) throw new DOMException('요청이 취소되었습니다.', 'AbortError')
  return body
}
export const api = {
  get: (path, options) => request(path, options),
  post: (path, body, options = {}) => request(path, { ...options, method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: (path, body, options = {}) => request(path, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body, options = {}) => request(path, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path, options = {}) => request(path, { ...options, method: 'DELETE' }),
}
