import React, { useEffect, useRef, useState } from 'react'
import { api } from '../../api/client'
import PlacePicker from '../shared/PlacePicker'
import DateField from '../shared/DateField'
import { localDate } from '../shared/format'
import { EmptyState, ErrorNotice, Loading } from '../shared/Feedback'
import PostCard from './PostCard'

export default function SearchPage({ memberId, onOpen, onCreate, revision }) {
  const [form, setForm] = useState({ type: '', origin: null, destination: null, date: '', radius: '1000' })
  const [query, setQuery] = useState({})
  const [result, setResult] = useState({ items: [], nextCursor: null, hasNext: false })
  const [loading, setLoading] = useState(true)
  const [more, setMore] = useState(false)
  const [error, setError] = useState('')
  const generation = useRef(0)
  const controller = useRef(null)
  const set = (name, value) => setForm(previous => ({ ...previous, [name]: value }))
  useEffect(() => {
    const current = ++generation.current
    controller.current?.abort()
    const abort = new AbortController()
    controller.current = abort
    setLoading(true); setError(''); setMore(false)
    setResult({ items: [], nextCursor: null, hasNext: false })
    api.get(`/discovery/posts?${new URLSearchParams({ ...query, limit: '12' })}`, { signal: abort.signal })
      .then(({ data }) => { if (current === generation.current) setResult(data) })
      .catch(e => { if (e.name !== 'AbortError' && current === generation.current) setError(e.message) })
      .finally(() => { if (current === generation.current) setLoading(false) })
    return () => abort.abort()
  }, [query, revision])
  async function loadMore() {
    if (loading || more || !result.hasNext) return
    const current = generation.current
    setMore(true); setError('')
    try {
      const { data } = await api.get(`/discovery/posts?${new URLSearchParams({ ...query, limit: '12', cursor: result.nextCursor })}`, { signal: controller.current.signal })
      if (current === generation.current) setResult(previous => ({ ...data, items: [...new Map([...previous.items, ...data.items].map(p => [p.id, p])).values()] }))
    } catch (e) { if (e.name !== 'AbortError' && current === generation.current) setError(e.message) }
    finally { if (current === generation.current) setMore(false) }
  }
  function search(event) {
    event.preventDefault()
    const next = {}
    if (form.type) next.type = form.type
    if (form.date) { next.from = `${form.date}T00:00:00`; const end = new Date(`${form.date}T00:00:00`); end.setDate(end.getDate() + 1); next.to = `${localDate(end)}T00:00:00` }
    if (form.origin) Object.assign(next, { originLat: form.origin.lat, originLng: form.origin.lng, originRadiusMeters: form.radius })
    if (form.destination) Object.assign(next, { destinationLat: form.destination.lat, destinationLng: form.destination.lng, destinationRadiusMeters: form.radius })
    setQuery(next)
  }
  return <>
    <section className="hero"><div><span className="eyebrow">같은 방향, 가벼워지는 하루</span><h1>가는 길이 같다면,<br /><em>모아</em>서 함께 가요.</h1><p>출퇴근 카풀부터 택시 동승까지.<br />함께 갈 사람을 찾고, 편하게 만나세요.</p></div>
      <div className="journey-art" aria-hidden="true"><div className="art-card origin"><span>출발</span><strong>나의 일상</strong><i>●</i></div><div className="journey-path" /><div className="car-symbol">↗</div><div className="art-card destination"><span>도착</span><strong>우리의 목적지</strong><i>✦</i></div><span className="art-caption">A LITTLE COMPANY. A BETTER JOURNEY.</span></div>
    </section>
    <form className="search-panel" onSubmit={search}>
      <div className="transport-tabs" role="group" aria-label="이동 수단">{[['', '모두 보기'], ['CARPOOL', '출퇴근 카풀'], ['TAXI', '택시 동승']].map(([key, label]) => <button type="button" key={key} className={form.type === key ? 'active' : ''} aria-pressed={form.type === key} onClick={() => set('type', key)}>{label}</button>)}</div>
      <div className="search-fields"><PlacePicker label="출발지" value={form.origin} onChange={value => set('origin', value)} optional />
        <PlacePicker label="목적지" value={form.destination} onChange={value => set('destination', value)} optional />
        <DateField value={form.date} onChange={value => set('date', value)} />
        <label>장소 주변<select value={form.radius} onChange={e => set('radius', e.target.value)}><option value="500">500m 이내</option><option value="1000">1km 이내</option><option value="3000">3km 이내</option><option value="5000">5km 이내</option></select></label>
        <button className="button primary search-button" type="submit">같이 갈 사람 찾기 <span aria-hidden="true">→</span></button></div>
      <div className="search-foot"><span>출발지와 목적지 주변을 함께 찾아요. 날짜를 비우면 앞으로 48시간을 검색합니다.</span><button type="button" className="text-button" onClick={() => { setForm({ type: '', origin: null, destination: null, date: '', radius: '1000' }); setQuery({}) }}>초기화</button></div>
    </form>
    <section className="results-section"><div className="section-heading"><div><span className="eyebrow">FIND YOUR COMPANY</span><h2>함께 갈 사람을 기다려요</h2></div><span className="muted">출발이 빠른 순</span></div>
      <ErrorNotice error={error} retry={() => setQuery({ ...query })} />
      {loading ? <Loading /> : result.items.length ? <div className="post-grid">{result.items.map(post => <PostCard key={post.id} post={post} memberId={memberId} onOpen={onOpen} />)}</div> : !error && <EmptyState title="이 조건에 맞는 모집이 아직 없어요">장소나 날짜를 바꿔 보세요. 직접 모집을 시작할 수도 있어요.<button className="button secondary" onClick={onCreate}>모집 시작하기</button></EmptyState>}
      {!loading && result.hasNext && <button className="button secondary load-more" onClick={loadMore} disabled={more}>{more ? '불러오는 중…' : '모집 더 보기'}</button>}
    </section>
    <section className="how-it-works"><h2>함께 가는 일,<br />간단하게.</h2>{[['01', '갈 곳 찾기', '같은 방향과 시간의 모집을 찾아요.'], ['02', '참여 신청', '모집자가 승인하면 참여가 확정돼요.'], ['03', '만나서 출발', '필요할 때만 위치를 공유하고 만나요.']].map(([n, title, body]) => <div key={n}><span>{n}</span><h3>{title}</h3><p>{body}</p></div>)}</section>
  </>
}
