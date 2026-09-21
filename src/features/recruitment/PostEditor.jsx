import React, { useState } from 'react'
import { createPost, updatePost } from '../../api/posts'
import PlacePicker from '../shared/PlacePicker'
import Dialog from '../shared/Dialog'
import DateField from '../shared/DateField'
import { ErrorNotice } from '../shared/Feedback'
import { buildPostPayload } from './postPayload'
export default function PostEditor({ post, frozen = false, onClose, onSaved }) {
  const [type, setType] = useState(post?.type || 'CARPOOL')
  const [origin, setOrigin] = useState(post ? { name: post.departureLocation, lat: post.departureLat, lng: post.departureLng } : null)
  const [destination, setDestination] = useState(post ? { name: post.destinationLocation, lat: post.destinationLat, lng: post.destinationLng } : null)
  const [date, setDate] = useState(post?.departureTime?.slice(0, 10) || '')
  const [time, setTime] = useState(post?.departureTime?.slice(11, 16) || '08:00')
  const [capacity, setCapacity] = useState(post?.capacity || 3)
  const [price, setPrice] = useState(post?.price ?? '')
  const [description, setDescription] = useState(post?.description || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault(); setError('')
    if (!origin || !destination || !date || !time) { setError('출발지, 목적지, 출발 시간을 모두 선택해 주세요.'); return }
    if (busy) return
    setBusy(true)
    try {
      const payload = buildPostPayload({ post, frozen, type, origin, destination, date, time, capacity, price, description })
      const saved = post ? await updatePost(post.id, payload) : await createPost(payload)
      onSaved(saved); onClose()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  return <Dialog title={post ? '모집 내용 수정' : '함께 갈 사람 모집하기'} onClose={() => { if (!busy) onClose() }}>
    <form className="stack" onSubmit={submit}>
      <div className="transport-tabs"><button type="button" className={type === 'CARPOOL' ? 'active' : ''} disabled={frozen} onClick={() => setType('CARPOOL')}>출퇴근 카풀</button><button type="button" className={type === 'TAXI' ? 'active' : ''} disabled={frozen} onClick={() => { setType('TAXI'); setCapacity(Math.max(2, capacity)) }}>택시 동승</button></div>
      <p className="notice">{type === 'CARPOOL' ? '운전자 등록 후 평일 출퇴근 시간에 비용을 나누는 카풀을 모집할 수 있어요. 오전 7–9시 / 오후 6–8시, 공휴일 제외.' : '택시에 함께 탈 사람을 모집해요. 직접 택시를 이용하고 비용은 외부에서 나눠 주세요.'}</p>
      {frozen ? <p className="notice">신청자가 있어 경로·시간·이동 수단·예상 금액을 변경할 수 없어요.<br />{origin.name} → {destination.name} · {date} {time}</p> : <><PlacePicker label="출발지" value={origin} onChange={setOrigin} /><PlacePicker label="목적지" value={destination} onChange={setDestination} />
        <div className="form-row"><DateField required value={date} onChange={setDate} /><label>출발 시간<input required type="time" value={time} onChange={e => setTime(e.target.value)} /></label></div></>}
      <div className="form-row"><label>{type === 'TAXI' ? '전체 인원 (모집자 포함)' : '동승자 정원 (운전자 제외)'}<input type="number" min={Math.max(type === 'TAXI' ? 2 : 1, post?.occupiedSeats || 0)} max="8" required value={capacity} onChange={e => setCapacity(e.target.value)} /></label>
        <label>예상 1인 분담금 (원)<input type="number" min="0" max="1000000" value={price} disabled={frozen} placeholder="미정이면 비워 두세요" onChange={e => setPrice(e.target.value)} /></label></div>
      <label>함께 갈 분에게<textarea rows={3} maxLength={2000} placeholder="정확한 만남 장소, 짐 등 필요한 정보를 알려 주세요." value={description} onChange={e => setDescription(e.target.value)} /></label>
      <p className="muted small">참여 신청은 모집자의 승인 후 확정됩니다. 택시 호출과 결제는 제공하지 않습니다.</p>
      <ErrorNotice error={error} /><button type="submit" disabled={busy} className="button primary">{busy ? '저장 중…' : post ? '수정 내용 저장' : '모집 등록하기'}</button>
    </form>
  </Dialog>
}
