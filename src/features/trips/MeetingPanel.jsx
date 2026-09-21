import React, { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { ErrorNotice, Loading } from '../shared/Feedback'
import { departureLabel } from '../shared/format'
import { useTripAction, useTripResource } from './useTripRequest'
import { sameMember } from './tripContract'
import TaxiExpense from './TaxiExpense'
import MeetingLocation from './MeetingLocation'

const meetingLabel = status => ({ PENDING: '만남 대기', MET: '만남 확인', NO_SHOW: '불참' }[status] || status)

export default function MeetingPanel({ post, memberId, revision, onChanged }) {
  const meeting = useTripResource(`/posts/${post.id}/meeting`, revision)
  const [now, setNow] = useState(Date.now())
  const [confirm, setConfirm] = useState(false)
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(timer) }, [])
  const action = useTripAction(async () => { await meeting.reload(); await onChanged?.() })
  const view = meeting.data
  useEffect(() => {
    const refresh = () => meeting.reload()
    window.addEventListener('focus', refresh)
    const untilOpen = new Date(view?.locationSharingFrom).getTime() - Date.now()
    let timer
    const waitForWindow = () => {
      const remaining = new Date(view.locationSharingFrom).getTime() - Date.now()
      if (remaining <= 0) refresh()
      else timer = setTimeout(waitForWindow, Math.min(remaining + 250, 3600000))
    }
    if (!view?.completedAt && untilOpen > 0) waitForWindow()
    return () => { window.removeEventListener('focus', refresh); clearTimeout(timer) }
  }, [meeting.reload, view?.locationSharingFrom, view?.completedAt])
  const host = sameMember(view?.hostId, memberId)
  const canMark = host && !view?.completedAt && now >= new Date(view?.locationSharingFrom).getTime()
  const canComplete = canMark && view?.participants.length > 1 && view.participants.every(person => person.status !== 'PENDING')
  function mark(person, status) {
    action.run(() => api.patch(`/posts/${post.id}/meeting/participants/${person.memberId}`, { status }), '만남 상태를 저장했어요.')
  }
  return <section className="stack" aria-label="만남 준비"><h3>만날 준비</h3>
    <ErrorNotice error={meeting.error} retry={meeting.reload} />
    {!view ? meeting.loading && <Loading /> : <>
      <p className="muted">{view.completedAt ? `${departureLabel(view.completedAt)} · 만남 완료` : '출발 30분 전부터 모집자가 만남을 확인해요. 불참은 출발 시각부터 기록할 수 있어요.'}</p>
      <ErrorNotice error={action.error} />{action.notice && <p className="notice" role="status">{action.notice}</p>}
      {view.participants.map(person => <div className="notice" key={person.memberId}>
        <p><strong>{person.nickname}</strong> {person.host ? '· 모집자' : sameMember(person.memberId, memberId) ? '· 나' : ''} <span className={`status-pill ${person.status.toLowerCase()}`}>{person.host ? '모집자' : meetingLabel(person.status)}</span></p>
        {canMark && !person.host && <div className="form-row"><button className="button primary" disabled={action.busy || person.status === 'MET'} onClick={() => mark(person, 'MET')}>만남 확인</button><button className="button secondary" disabled={action.busy || person.status === 'NO_SHOW' || now < new Date(post.departureTime).getTime()} onClick={() => mark(person, 'NO_SHOW')}>불참으로 기록</button></div>}
      </div>)}
      {host && !view.completedAt && <>
        <button className="button primary" disabled={action.busy || !canComplete} onClick={() => setConfirm(true)}>만남 완료하기</button>
        {!canComplete && <p className="muted">출발 30분 전부터, 모든 참가자의 만남·불참 상태를 기록하면 완료할 수 있어요.</p>}
        {confirm && <div className="notice"><p>완료하면 신청 취소·참가자 변경과 위치 공유가 종료돼요. 실제 만남 상태를 확인해 주세요.</p><div className="form-row"><button className="button secondary" disabled={action.busy} onClick={() => setConfirm(false)}>다시 확인</button><button className="button primary" disabled={action.busy || !canComplete} onClick={async () => { if (await action.run(() => api.post(`/posts/${post.id}/meeting/complete`), '만남을 완료했어요.')) setConfirm(false) }}>완료 확정</button></div></div>}
      </>}
      <MeetingLocation post={post} meeting={view} memberId={memberId} now={now} />
      {post.type === 'TAXI' && (view.completedAt ? <TaxiExpense postId={post.id} memberId={memberId} meeting={view} revision={revision} onChanged={onChanged} /> : <p className="notice">택시 비용은 만남 완료 후 실제 탑승한 사람끼리 나눌 수 있어요.</p>)}
    </>}
  </section>
}
