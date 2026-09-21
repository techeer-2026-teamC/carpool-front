import React, { useState } from 'react'
import { useNotifications } from './NotificationProvider'
import { EmptyState, ErrorNotice, Loading } from '../shared/Feedback'

const labels = { APPLICATION_RECEIVED: '새 참여 신청', APPLICATION_ACCEPTED: '참여 확정',
  APPLICATION_REJECTED: '신청 결과', POST_CANCELLED: '모집 취소', DEPARTURE_APPROACHING: '출발 안내',
  RIDE_STARTED: '이동 안내', RIDE_ENDED: '이동 완료' }
const postTypes = new Set(['APPLICATION_RECEIVED', 'APPLICATION_ACCEPTED', 'APPLICATION_REJECTED', 'POST_CANCELLED', 'DEPARTURE_APPROACHING'])
function timeLabel(value) {
  const date = new Date(value && !/(Z|[+-]\d\d:\d\d)$/.test(value) ? `${value}+09:00` : value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function NotificationPage({ onOpen }) {
  const { items, unreadCount, status, error, loading, loadingMore, hasNext, refresh, loadMore, markRead } = useNotifications()
  const [filter, setFilter] = useState('all')
  const [busy, setBusy] = useState(null)
  const visible = filter === 'unread' ? items.filter(item => !item.readAt) : items
  async function read(item, open) {
    setBusy(item.notificationId)
    try { await markRead(item.notificationId); if (open) onOpen?.(item.referenceId) }
    catch { /* The provider displays the failed operation and keeps the item unread. */ }
    finally { setBusy(null) }
  }
  return <section className="page-section stack" aria-labelledby="notifications-title">
    <header className="section-heading">
      <div><p className="eyebrow">INBOX</p><h1 id="notifications-title">내 알림</h1>
        <p className="muted">신청 결과와 출발 안내를 한곳에서 확인하세요.</p></div>
      <button className="button secondary" onClick={refresh} disabled={loading}>새로고침</button>
    </header>
    <div className="transport-tabs" aria-label="알림 필터">
      <button className={filter === 'all' ? 'active' : ''} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>전체</button>
      <button className={filter === 'unread' ? 'active' : ''} aria-pressed={filter === 'unread'} onClick={() => setFilter('unread')}>읽지 않음 {unreadCount > 0 && `(${unreadCount})`}</button>
    </div>
    <p className="muted" role="status">{status === 'live' ? '새 알림을 실시간으로 받고 있어요.' : status === 'paused'
      ? '화면으로 돌아오면 새 알림을 확인해요.' : '새 알림을 확인하고 있어요. 연결이 잠시 끊겨도 알림함에서 다시 확인할 수 있어요.'}</p>
    <ErrorNotice error={error} retry={refresh} />
    {loading && items.length === 0 ? <Loading /> : <>
      {visible.length === 0 && <EmptyState title={filter === 'unread' ? '표시할 읽지 않은 알림이 없어요' : '아직 도착한 알림이 없어요'}>
        {hasNext ? '이전 알림을 더 불러와 확인할 수 있어요.' : '참여 신청과 출발 소식이 도착하면 알려드릴게요.'}
      </EmptyState>}
      <ul className="stack notification-list" aria-label="받은 알림" style={{ listStyle: 'none', padding: 0 }}>
        {visible.map(item => <li key={item.notificationId} className="notification-card stack">
          <div><span className="status-pill">{labels[item.type] || '안내'}</span>{!item.readAt && <span className="status-pill">읽지 않음</span>}</div>
          <p>{item.message}</p><time className="muted" dateTime={item.createdAt}>{timeLabel(item.createdAt)}</time>
          <div className="action-row">
            {postTypes.has(item.type) && item.referenceId && onOpen && <button className="button primary" disabled={busy != null} onClick={() => read(item, true)}>모집 보기</button>}
            {!item.readAt && <button className="button secondary" disabled={busy != null} onClick={() => read(item, false)}>{busy === item.notificationId ? '처리 중…' : '읽음으로 표시'}</button>}
          </div>
        </li>)}
      </ul>
      {hasNext && <button className="button secondary" disabled={loadingMore} onClick={loadMore}>{loadingMore ? '불러오는 중…' : '이전 알림 더 보기'}</button>}
    </>}
  </section>
}
