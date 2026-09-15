import React, { useEffect, useRef, useState } from 'react'
import { api } from '../../api/client'
import PostCard from '../discovery/PostCard'
import { EmptyState, ErrorNotice, Loading } from '../shared/Feedback'
import { statusLabel, departureLabel } from '../shared/format'
export default function MyTrips({ memberId, revision, onOpen }) {
  const [tab, setTab] = useState('host')
  const [posts, setPosts] = useState([])
  const [applications, setApplications] = useState([])
  const [page, setPage] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const generation = useRef(0)
  useEffect(() => {
    const current = ++generation.current
    const abort = new AbortController()
    setBusy(true); setError('')
    const load = tab === 'host' ? api.get(`/posts/mine?page=${page}&size=12`, { signal: abort.signal }) : api.get('/applications/me', { signal: abort.signal })
    load.then(async ({ data }) => {
      if (current !== generation.current) return
      if (tab === 'host') {
        if (current !== generation.current) return
        setPosts(data.content || data.items || []); setHasNext(data.hasNext ?? !data.last)
      } else {
        const details = await Promise.all(data.map(async app => {
          try { const { data: post } = await api.get(`/posts/${app.postId}`, { signal: abort.signal }); return { ...app, post } }
          catch (error) { if (error.status === 404) return app; throw error }
        }))
        if (current === generation.current) setApplications(details)
      }
    }).catch(e => { if (current === generation.current) setError(e.message) })
      .finally(() => { if (current === generation.current) setBusy(false) })
    return () => { generation.current++; abort.abort() }
  }, [tab, page, revision, memberId, retry])
  return <section className="page-section"><span className="eyebrow">MY JOURNEYS</span><h1>나의 동행</h1><p className="muted">모집과 신청 내역을 확인하고, 함께 갈 준비를 해요.</p>
    <div className="transport-tabs"><button className={tab === 'host' ? 'active' : ''} onClick={() => { setTab('host'); setPage(0) }}>내가 모집한 동행</button><button className={tab === 'applied' ? 'active' : ''} onClick={() => setTab('applied')}>내가 신청한 동행</button></div>
    <ErrorNotice error={error} retry={() => setRetry(value => value + 1)} />
    {busy ? <Loading /> : tab === 'host' ? posts.length ? <div className="post-grid">{posts.map(post => <PostCard key={post.id} post={post} memberId={memberId} onOpen={onOpen} />)}</div> : !error && <EmptyState title="아직 모집한 동행이 없어요">상단의 모집하기에서 시작할 수 있어요.</EmptyState> : applications.length ? <div className="stack">{applications.map(app => <button className="application-card" key={app.id} onClick={() => onOpen(app.postId)} disabled={!app.post}>
      <span className={`status-pill ${app.status.toLowerCase()}`}>{statusLabel(app.status)}</span><div><h3>{app.post ? `${app.post.departureLocation} → ${app.post.destinationLocation}` : '취소되거나 삭제된 모집'}</h3><p className="muted">{app.post ? departureLabel(app.post.departureTime) : `모집 #${app.postId}`}</p></div><span aria-hidden="true">→</span>
    </button>)}</div> : !error && <EmptyState title="아직 신청한 동행이 없어요">마음에 드는 모집을 찾고 참여를 신청해 보세요.</EmptyState>}
    {tab === 'host' && <div className="pagination"><button className="button secondary" disabled={page === 0 || busy} onClick={() => setPage(p => p - 1)}>이전</button><span>{page + 1}</span><button className="button secondary" disabled={!hasNext || busy} onClick={() => setPage(p => p + 1)}>다음</button></div>}
  </section>
}
