import React, { useEffect, useState } from 'react'
import { api } from '../../api/client'
import Dialog from '../shared/Dialog'
import PlaceMap from '../shared/PlaceMap'
import { ErrorNotice, Loading } from '../shared/Feedback'
import { departureLabel, statusLabel, typeLabel, won } from '../shared/format'
import ApplicationPanel from './ApplicationPanel'
import { useTripAction, useTripResource } from './useTripRequest'
import { beforeCutoff, sameMember } from './tripContract'

export default function TripDetail({ postId, memberId, revision, onClose, onChanged, onEdit, onLogin }) {
  const detail = useTripResource(`/posts/${postId}`, revision)
  const post = detail.data
  const host = sameMember(post?.memberId, memberId)
  const applications = useTripResource(!post || !memberId ? null : host ? `/posts/${postId}/applications` : '/applications/me', `${revision}:${memberId}`)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(timer) }, [])
  const reload = async () => {
    await Promise.all([detail.reload(), applications.reload()])
    onChanged?.()
  }
  const action = useTripAction(reload)
  const canChange = beforeCutoff(post, now)
  const markers = post ? [
    { lat: post.departureLat, lng: post.departureLng, name: `출발 · ${post.departureLocation}` },
    { lat: post.destinationLat, lng: post.destinationLng, name: `도착 · ${post.destinationLocation}` },
  ].filter(point => Number.isFinite(point.lat) && Number.isFinite(point.lng)) : []
  return <Dialog title={post?.title || '동행 상세'} onClose={() => { if (!action.busy) onClose() }} wide>
    <div className="stack">
      <div className="action-row"><button className="button secondary" disabled={action.busy || detail.loading || applications.loading} onClick={reload}>최신 상태 새로고침</button></div>
      <ErrorNotice error={detail.error} retry={detail.reload} />
      {!post ? detail.loading && <Loading /> : <>
        <div className="form-row"><span className="type-pill">{typeLabel(post.type)}</span><span className={`status-pill ${post.status.toLowerCase()}`}>{statusLabel(post.status)}</span></div>
        <h3>{post.departureLocation} → {post.destinationLocation}</h3>
        <p className="departure-time">{departureLabel(post.departureTime)}</p>
        <div className="notice"><p><strong>{post.nickname}</strong> 님과 함께 · {post.occupiedSeats}/{post.capacity}명 · {post.availableSeats}자리 남음</p><p>{post.type === 'TAXI' ? '모집자를 포함한 전체 인원' : '운전자를 제외한 동승자 인원'} · 예상 1인 분담금 <strong>{won(post.price)}</strong></p></div>
        {post.description && <p style={{ whiteSpace: 'pre-wrap' }}>{post.description}</p>}
        {markers.length > 0 && <details><summary>출발지·도착지 지도 보기</summary><PlaceMap readOnly markers={markers} initial={markers[0]} /></details>}
        <ErrorNotice error={action.error} />{action.notice && <p className="notice" role="status">{action.notice}</p>}
        {host && <section className="stack" aria-label="모집 관리"><h3>모집 관리</h3><div className="form-row">
          <button className="button secondary" disabled={action.busy || !canChange || applications.loading || Boolean(applications.error)} onClick={() => onEdit?.(post, Boolean(applications.data?.length))}>모집 수정</button>
          {post.status === 'OPEN' && <button className="button secondary" disabled={action.busy || !canChange} onClick={() => setConfirmClose(true)}>모집 마감</button>}
          <button className="button secondary" disabled={action.busy || !canChange} onClick={() => setConfirmDelete(true)}>모집 삭제</button>
        </div>
          <p className="muted">정원이 차서 마감되었다면 취소·정원 변경으로 자리가 생길 때 자동으로 열려요. 직접 마감한 모집은 마감을 유지해요.</p>
          {confirmClose && <div className="notice"><p>직접 마감하면 다시 열 수 없어요. 확정된 참가자와의 만남은 계속 진행할 수 있어요.</p><div className="action-row"><button className="button secondary" disabled={action.busy} onClick={() => setConfirmClose(false)}>돌아가기</button><button className="button primary" disabled={action.busy || !canChange} onClick={async () => { if (await action.run(() => api.post(`/posts/${postId}/close`), '모집을 마감했어요.')) setConfirmClose(false) }}>마감 확정</button></div></div>}
          {!canChange && <p className="muted">출발 또는 만남이 완료되어 모집 내용을 변경할 수 없어요.</p>}
          {confirmDelete && <div className="notice error"><p>모집을 삭제하면 신청도 취소되고, 확정된 참가자에게 알림을 보내요.</p><div className="form-row"><button className="button secondary" disabled={action.busy} onClick={() => setConfirmDelete(false)}>돌아가기</button><button className="button primary" disabled={action.busy} onClick={async () => { if (await action.run(() => api.delete(`/posts/${postId}`), '모집을 삭제했어요.')) onClose() }}>삭제 확인</button></div></div>}
        </section>}
        <ApplicationPanel onLogin={onLogin} post={post} memberId={memberId} host={host} applications={applications.data} loading={applications.loading} error={applications.error} retry={applications.reload} action={action} />
      </>}
    </div>
  </Dialog>
}
