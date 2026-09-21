import React from 'react'
import { departureLabel, won, typeLabel, statusLabel } from '../shared/format'
export default function PostCard({ post, memberId, onOpen }) {
  return <button className="post-card" onClick={() => onOpen(post.id)}>
    <div className="card-eyebrow"><span className={`type-pill ${post.type === 'TAXI' ? 'taxi' : ''}`}>{post.type === 'TAXI' ? 'T' : 'C'} · {typeLabel(post.type)}</span>
      <span className="muted">{post.memberId === memberId ? '내 모집' : statusLabel(post.status)}</span></div>
    <div className="route-display"><span className="route-node" /><h3>{post.departureLocation}</h3><span className="route-line" /><span className="route-node end" /><h3>{post.destinationLocation}</h3></div>
    <p className="departure-time">{departureLabel(post.departureTime)}</p>
    <div className="card-host"><span className="avatar">{(post.nickname || '모')[0]}</span><span>{post.nickname}</span><span className="seat-text">{post.availableSeats}자리 남음</span></div>
    <div className="card-bottom"><span>{post.type === 'TAXI' ? '예상 1인 분담금' : '1인 비용 분담'}<strong>{won(post.price)}</strong></span><span className="card-arrow" aria-hidden="true">↗</span></div>
  </button>
}
