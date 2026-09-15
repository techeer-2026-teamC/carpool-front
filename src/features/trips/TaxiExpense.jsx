import React, { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { EmptyState, ErrorNotice, Loading } from '../shared/Feedback'
import { departureLabel, won } from '../shared/format'
import { sameMember } from './tripContract'
import { useTripAction, useTripResource } from './useTripRequest'

const auditLabel = action => ({ TOTAL_CHANGED: '총액 변경', COLLECTED: '수금 기록', COLLECTION_UNDONE: '수금 취소' }[action] || action)
export default function TaxiExpense({ postId, memberId, meeting, revision, onChanged }) {
  const expense = useTripResource(`/posts/${postId}/expense`, revision)
  const [showHistory, setShowHistory] = useState(false)
  const history = useTripResource(showHistory ? `/posts/${postId}/expense/history` : null, revision)
  const [total, setTotal] = useState('')
  const [validation, setValidation] = useState('')
  const action = useTripAction(async () => { await Promise.all([expense.reload(), history.reload()]); await onChanged?.() })
  const view = expense.data
  const host = sameMember(memberId, meeting.hostId)
  const hasCollected = view?.shares.some(share => share.collected)
  const attendees = meeting.participants.filter(person => person.status === 'MET')
  useEffect(() => { if (view) setTotal(view.total ?? '') }, [view?.total])
  function save(event) {
    event.preventDefault(); setValidation('')
    if (total === '' || !Number.isSafeInteger(Number(total)) || Number(total) < 0 || Number(total) > 10000000) {
      setValidation('총액은 0원부터 1,000만 원까지 정수로 입력해 주세요.'); return
    }
    action.run(() => api.put(`/posts/${postId}/expense`, { total: Number(total) }), '비용 분담액을 저장했어요.')
  }
  return <section className="stack" aria-label="택시 비용 나누기"><h3>택시 비용 나누기</h3>
    <p className="notice">외부에서 지불한 택시비를 기록해요. 결제나 송금은 이루어지지 않아요. 만남 확인된 {attendees.length}명으로 나누고, 나머지 금액은 모집자가 부담해요.</p>
    <ErrorNotice error={expense.error} retry={expense.reload} />
    {!view ? expense.loading && <Loading /> : <>
      <ErrorNotice error={action.error || validation} />{action.notice && <p className="notice" role="status">{action.notice}</p>}
      {host && <form className="stack" onSubmit={save}><label>실제 택시비 총액 (원)<input type="number" min="0" max="10000000" step="1" required value={total} disabled={action.busy || hasCollected || attendees.length < 2} onChange={event => setTotal(event.target.value)} /></label>
        <button className="button primary" disabled={action.busy || hasCollected || attendees.length < 2}>{action.busy ? '저장 중…' : '분담액 계산하고 저장'}</button>
        {hasCollected && <p className="muted">수금 기록이 있어 총액을 바꿀 수 없어요. 기록을 모두 취소한 뒤 변경해 주세요.</p>}
        {attendees.length < 2 && <p className="muted">실제 탑승자가 2명 이상일 때 비용을 나눌 수 있어요.</p>}
      </form>}
      {view.total == null ? <EmptyState title="아직 비용을 등록하지 않았어요">모집자가 실제 택시비를 입력하면 개인별 분담금이 표시돼요.</EmptyState> : <>
        <p>전체 택시비 <strong>{won(view.total)}</strong></p>
        {view.shares.map(share => <div className="notice" key={share.memberId}><p><strong>{share.nickname}</strong> {share.host ? '· 모집자' : sameMember(share.memberId, memberId) ? '· 나' : ''} <strong>{won(share.amount)}</strong></p>
          <p className="muted">{share.host ? '모집자 부담액' : share.collected ? '외부 수금 확인됨' : '수금 확인 전'}</p>
          {host && !share.host && <button className="button secondary" disabled={action.busy} onClick={() => action.run(() => api.patch(`/posts/${postId}/expense/members/${share.memberId}/collection`, { collected: !share.collected }), share.collected ? '수금 기록을 취소했어요.' : '외부 수금을 기록했어요.')}>{share.collected ? '수금 기록 취소' : '외부에서 받은 금액 확인'}</button>}
        </div>)}
      </>}
      <button className="button secondary" aria-expanded={showHistory} onClick={() => setShowHistory(value => !value)}>{showHistory ? '변경 이력 닫기' : '변경 이력 보기'}</button>
      {showHistory && <div className="stack"><ErrorNotice error={history.error} retry={history.reload} />{history.loading ? <Loading /> : history.data?.length ? <ol>{history.data.map(item => <li key={item.id}><strong>{auditLabel(item.action)}</strong><p className="muted">{departureLabel(item.createdAt)} · {meeting.participants.find(person => sameMember(person.memberId, item.actorId))?.nickname || '모집자'}</p><p>{item.action === 'TOTAL_CHANGED' ? item.detail.replace('null', '미등록') : '참가자의 외부 수금 기록을 변경했어요.'}</p></li>)}</ol> : !history.error && <p className="muted">변경 이력이 없어요.</p>}</div>}
    </>}
  </section>
}
