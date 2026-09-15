import React, { useEffect, useRef, useState } from 'react'
import { api } from '../../api/client'
import PlaceMap from '../shared/PlaceMap'
import { ErrorNotice } from '../shared/Feedback'
import { sameMember } from './tripContract'
import { visiblePositions, mergePosition } from './locationState'
import { openLocationChannel } from './locationChannel'

export default function MeetingLocation({ post, meeting, memberId, now }) {
  const [points, setPoints] = useState([])
  const [enabled, setEnabled] = useState(false)
  const [consent, setConsent] = useState(false)
  const [simulator, setSimulator] = useState(false)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [stopping, setStopping] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const session = useRef(null)
  const available = meeting.locationSharingAvailable && !meeting.completedAt
    && now >= new Date(meeting.locationSharingFrom).getTime() && now < new Date(meeting.locationSharingUntil).getTime()
  const scope = { postId: post.id, memberId, hostId: meeting.hostId, participants: meeting.participants }
  useEffect(() => {
    if (!available) { setPoints([]); setEnabled(false); setConsent(false); return }
    let alive = true, pending = false
    const load = async () => {
      if (pending || document.hidden) return
      pending = true
      try { const { data } = await api.get(`/posts/${post.id}/meeting/locations`); if (alive) setPoints(data || []) }
      catch (failure) { if (alive) { setError(failure.message); setPoints([]); if ([401, 403, 404].includes(failure.status)) setEnabled(false) } }
      finally { pending = false }
    }
    load()
    const timer = setInterval(load, 10000)
    window.addEventListener('focus', load)
    return () => { alive = false; clearInterval(timer); window.removeEventListener('focus', load) }
  }, [post.id, memberId, available, refresh])
  useEffect(() => {
    if (!enabled || !available) return
    let alive = true
    try {
      session.current = openLocationChannel({ postId: post.id, memberId, simulator,
        onPosition: point => { if (alive) setPoints(current => mergePosition(current, point)) },
        onStatus: value => { if (alive) setStatus(value) },
        onError: message => { if (alive) { setError(message); setEnabled(false); setConsent(false) } },
      })
    } catch (failure) { setError(failure.message); setEnabled(false) }
    return () => { alive = false; session.current?.stop().catch(() => {}); session.current = null }
  }, [enabled, available, post.id, memberId, simulator])
  async function stopSharing() {
    if (stopping) return
    setStopping(true); setError('')
    try { await session.current?.stop() }
    catch (failure) { setError(failure.message) }
    finally {
      setEnabled(false); setConsent(false); setStatus('idle'); setStopping(false)
      setPoints(current => current.filter(point => !sameMember(point.memberId, memberId)))
    }
  }
  const visible = visiblePositions(points, scope, now)
  const markers = visible.map(point => ({ lat: point.latitude, lng: point.longitude,
    name: meeting.participants.find(person => sameMember(person.memberId, point.memberId))?.nickname || '참가자' }))
  return <section className="stack" aria-label="만남 위치 공유"><h3>만날 때만 위치 공유</h3>
    {!available ? <p className="muted">위치는 출발 30분 전부터 30분 후까지, 만남 완료 전까지 공유할 수 있어요.</p> : <>
      <p className="muted">모집자는 참가자의 위치를, 참가자는 모집자와 자신의 위치만 확인해요. 마지막 위치는 1분 후 사라져요.</p>
      <ErrorNotice error={error} retry={() => { setError(''); setRefresh(value => value + 1) }} />
      {!enabled ? <><label><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} /> 현재 위치를 {sameMember(memberId, meeting.hostId) ? '이 동행의 참가자' : '이 동행의 모집자'}에게 공유하는 데 동의합니다.</label>
        {import.meta.env.DEV && <label className="muted small"><input type="checkbox" checked={simulator} onChange={event => setSimulator(event.target.checked)} /> 개발용 위치 시뮬레이터 사용 · 실제 GPS를 읽지 않고 선택한 지점을 전송합니다.</label>}
        <button className="button primary" disabled={!consent || stopping} onClick={() => { setError(''); setEnabled(true) }}>{simulator ? '개발용 위치 전송 연결' : '동의하고 위치 공유 시작'}</button></>
        : <div className="notice"><p role="status">{status === 'connected' ? simulator ? '개발용 시뮬레이터 연결됨' : 'GPS 위치 공유 중' : status === 'stopping' ? '위치 전송을 중지하고 연결을 정리하는 중…' : '위치 서버에 연결 중…'}</p><button className="button secondary" disabled={stopping} onClick={stopSharing}>{stopping ? '중지 중…' : '위치 공유 중지'}</button></div>}
      {enabled && simulator && status === 'connected' && <PlaceMap initial={{ lat: post.departureLat, lng: post.departureLng }} onSelect={point => {
        if (!session.current?.publish({ latitude: point.lat, longitude: point.lng })) setError('연결 상태를 확인하고, 이전 전송에서 5초 후 다시 보내 주세요.')
      }} />}
      {markers.length ? <PlaceMap readOnly markers={markers} initial={markers[0]} /> : <p className="muted">지금 공유 중인 위치가 없어요.</p>}
      {visible.map(point => <p className="muted small" key={point.memberId}>{meeting.participants.find(person => sameMember(person.memberId, point.memberId))?.nickname || '참가자'} · {new Date(point.recordedAt).toLocaleTimeString('ko-KR')} 확인</p>)}
    </>}
  </section>
}
