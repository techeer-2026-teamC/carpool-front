import { Client } from '@stomp/stompjs'
import { API_BASE, getToken, refreshAccessToken } from '../../api/client.js'

function tokenPayload(value) {
  try { return JSON.parse(atob(value.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) }
  catch { return null }
}

export function openLocationChannel({ postId, memberId, simulator, onPosition, onStatus, onError }) {
  if (!simulator && !navigator.geolocation) throw new Error('이 브라우저에서는 위치 공유를 지원하지 않아요.')
  const url = new URL(import.meta.env?.VITE_API_BASE || window.location.origin)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.pathname = '/ws'; url.search = ''; url.hash = ''
  let stopped = false, watch = null, timer = null, expiryTimer = null, latest = null, lastSent = 0, token = null, closing = null
  const client = new Client({ brokerURL: url.toString(), reconnectDelay: 0, connectionTimeout: 10000,
    heartbeatIncoming: 10000, heartbeatOutgoing: 10000, debug: () => {} })
  function publish(point) {
    if (stopped || !client.connected || Date.now() - lastSent < 5000) return false
    client.publish({ destination: `/app/meetings/${postId}/location`,
      body: JSON.stringify({ latitude: point.latitude, longitude: point.longitude }) })
    lastSent = Date.now()
    return true
  }
  function stop() {
    if (closing) return closing
    stopped = true
    if (watch != null) navigator.geolocation.clearWatch(watch)
    clearInterval(timer); clearTimeout(expiryTimer)
    window.removeEventListener('auth:token', tokenChanged)
    window.removeEventListener('auth:logout', tokenChanged)
    window.removeEventListener('storage', tokenChanged)
    const current = getToken()
    const claims = tokenPayload(current)
    // This is an account-bound replay guard; the server still validates the selected token.
    const cleanupToken = claims?.token_use === 'access' && String(claims.memberId) === String(memberId) ? current : token
    closing = client.deactivate({ force: true }).then(async () => {
      if (!token) return
      // Keep cleanup bound to the original account, including after logout or account changes.
      const response = await fetch(`${API_BASE}/posts/${postId}/meeting/locations/me`, {
        method: 'DELETE', credentials: 'include', keepalive: true, headers: { Authorization: `Bearer ${cleanupToken}` },
      })
      if (!response.ok) throw new Error('위치 전송은 중지했지만 마지막 위치 삭제를 확인하지 못했어요. 저장된 위치는 최대 1분 후 사라져요.')
    })
    return closing
  }
  function fail(message) {
    if (stopped) return
    onStatus('stopping')
    stop().then(() => onError(message), error => onError(`${message} ${error.message}`))
  }
  function tokenChanged() {
    if (getToken() !== token) fail('로그인 상태가 바뀌어 위치 전송을 중지했어요. 다시 동의한 뒤 공유해 주세요.')
  }
  client.beforeConnect = async () => {
    try {
      token = getToken()
      if (!token) throw new Error('다시 로그인한 뒤 위치를 공유해 주세요.')
      const payload = tokenPayload(token)
      if (Number(payload?.exp) * 1000 <= Date.now() + 10000) token = await refreshAccessToken()
      if (stopped) { await client.deactivate({ force: true }); return }
      client.connectHeaders = { Authorization: `Bearer ${token}` }
    } catch (error) { fail(error.message) }
  }
  client.onConnect = () => {
    if (stopped) return
    client.subscribe(`/topic/meetings/${postId}/members/${memberId}`, message => {
      if (stopped) return
      try { onPosition(JSON.parse(message.body)) } catch { /* Ignore a malformed transport event. */ }
    })
    onStatus('connected')
    window.addEventListener('auth:token', tokenChanged)
    window.addEventListener('auth:logout', tokenChanged)
    window.addEventListener('storage', tokenChanged)
    const remaining = Number(tokenPayload(token)?.exp) * 1000 - Date.now()
    expiryTimer = setTimeout(() => fail('인증 만료 전에 위치 공유를 중지했어요. 다시 동의하면 새 인증으로 연결해요.'), Math.max(0, remaining - 1000))
    if (!simulator) {
      watch = navigator.geolocation.watchPosition(position => {
        latest = { latitude: position.coords.latitude, longitude: position.coords.longitude, at: position.timestamp }
        publish(latest)
      }, error => fail(error.code === 1 ? '위치 권한이 허용되지 않았어요. 브라우저 설정에서 권한을 확인해 주세요.' : '현재 위치를 확인하지 못했어요. 다시 시도해 주세요.'),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 })
      timer = setInterval(() => { if (latest && Date.now() - latest.at < 15000) publish(latest) }, 5000)
    }
  }
  client.onStompError = () => { if (!stopped) fail('위치 연결 권한을 확인하지 못했어요. 새로고침 후 다시 연결해 주세요.') }
  client.onWebSocketClose = () => { if (!stopped) fail('위치 연결이 종료되어 전송을 중지했어요. 다시 동의하면 연결할 수 있어요.') }
  client.onWebSocketError = () => { if (!stopped) fail('위치 서버에 연결하지 못했어요.') }
  onStatus('connecting')
  client.activate()
  return { stop, publish }
}
