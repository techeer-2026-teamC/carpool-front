import React from 'react'
import { api } from '../../api/client'
import { EmptyState, ErrorNotice, Loading } from '../shared/Feedback'
import { statusLabel } from '../shared/format'
import { beforeCutoff } from './tripContract'

export default function ApplicationPanel({ post, memberId, host, applications, loading, error, retry, action, onLogin }) {
  const canChange = beforeCutoff(post)
  const canApply = canChange && post.status === 'OPEN' && post.availableSeats > 0
  const mine = applications?.find(item => String(item.postId) === String(post.id) && String(item.applicantId) === String(memberId))
  const change = (id, verb, message) => action.run(() => api.patch(`/applications/${id}/${verb}`), message)
  if (!memberId) return <div className="notice"><p>참여하려면 로그인해 주세요. 신청은 모집자의 승인 후 확정돼요.</p>{onLogin && <button className="button primary" onClick={onLogin}>로그인하고 참여하기</button>}</div>
  return <section className="stack" aria-label={host ? '신청자 관리' : '내 참여 신청'}>
    <h3>{host ? '함께 갈 사람' : '내 참여 신청'}</h3>
    <ErrorNotice error={error} retry={retry} />
    {loading ? <Loading /> : error ? null : host ? <>
      <p className="muted">승인한 사람만 정원에 포함돼요. 출발 또는 만남 완료 후에는 신청 상태를 바꿀 수 없어요.</p>
      {!applications?.length ? <EmptyState title="아직 신청자가 없어요">참여 신청이 도착하면 여기서 승인할 수 있어요.</EmptyState> : applications.map(item =>
        <div className="notice" key={item.id}><div><strong>{item.applicantNickname || '참가자'}</strong> <span className={`status-pill ${item.status.toLowerCase()}`}>{statusLabel(item.status)}</span></div>
          {canChange && <div className="form-row">
            {item.status === 'PENDING' && <><button className="button primary" disabled={action.busy || !canApply} onClick={() => change(item.id, 'accept', '참여를 승인했어요.')}>승인</button><button className="button secondary" disabled={action.busy} onClick={() => change(item.id, 'reject', '신청을 거절했어요.')}>거절</button></>}
            {item.status === 'ACCEPTED' && <button className="button secondary" disabled={action.busy} onClick={() => change(item.id, 'cancel-accept', '승인을 취소하고 대기 상태로 바꿨어요.')}>승인 취소</button>}
            {item.status === 'REJECTED' && <button className="button secondary" disabled={action.busy} onClick={() => change(item.id, 'cancel-reject', '신청을 대기 상태로 복원했어요.')}>대기로 복원</button>}
          </div>}
        </div>)}
    </> : <>
      {mine && <p>현재 상태 <span className={`status-pill ${mine.status.toLowerCase()}`}>{statusLabel(mine.status)}</span></p>}
      {(!mine || mine.status === 'CANCELLED') ? <button className="button primary" disabled={action.busy || !canApply} onClick={() => action.run(() => api.post(`/posts/${post.id}/applications`), '참여를 신청했어요. 모집자의 승인을 기다려 주세요.')}>{mine ? '다시 참여 신청' : '참여 신청하기'}</button>
        : canChange && <button className="button secondary" disabled={action.busy} onClick={() => change(mine.id, 'cancel', '참여 신청을 취소했어요.')}>신청 취소</button>}
      <p className="muted">{!canChange ? '출발 또는 만남이 완료되어 신청을 변경할 수 없어요.' : !canApply ? '현재 모집이 마감되었어요.' : mine?.status === 'ACCEPTED' ? '참여가 확정되었어요. 아래에서 만남을 준비해 주세요.' : '승인 대기 중에는 좌석이 예약되지 않아요.'}</p>
    </>}
  </section>
}
