import React, { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import { TAG_MAP } from '../data/tags'
import { fmtPrice } from './CarpoolCard'
import { fetchComments, createComment, removeComment } from '../api/comments'

function RouteMap({ fromLat, fromLng, toLat, toLng }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return
    const hasFrom = fromLat != null && fromLng != null
    const hasTo = toLat != null && toLng != null
    if (!hasFrom && !hasTo) return

    const map = L.map(containerRef.current, { zoomControl: false, attributionControl: false })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map)

    const points = []
    if (hasFrom) {
      L.circleMarker([fromLat, fromLng], { radius: 9, color: '#6b7c3f', fillColor: '#6b7c3f', fillOpacity: 1, weight: 2 })
        .bindTooltip('출발', { permanent: true, direction: 'top', offset: [0, -10] })
        .addTo(map)
      points.push([fromLat, fromLng])
    }
    if (hasTo) {
      L.circleMarker([toLat, toLng], { radius: 9, color: '#c0392b', fillColor: '#c0392b', fillOpacity: 1, weight: 2 })
        .bindTooltip('도착', { permanent: true, direction: 'top', offset: [0, -10] })
        .addTo(map)
      points.push([toLat, toLng])
    }
    if (hasFrom && hasTo) {
      L.polyline([[fromLat, fromLng], [toLat, toLng]], { color: '#6b7c3f', weight: 2, dashArray: '6,8' }).addTo(map)
      map.fitBounds(points, { padding: [40, 40] })
    } else {
      map.setView(points[0], 14)
    }

    return () => map.remove()
  }, [fromLat, fromLng, toLat, toLng])

  if (fromLat == null && toLat == null) return null

  return <div ref={containerRef} style={mapStyle} />
}

const mapStyle = {
  height: 170,
  borderRadius: 10,
  overflow: 'hidden',
  marginBottom: '1.2rem',
  border: '1px solid var(--border)',
}

function CommentItem({ comment, currentMemberId, onDelete }) {
  const isOwn = comment.memberId === currentMemberId
  return (
    <div style={styles.commentItem}>
      <div style={styles.commentMeta}>
        <span style={styles.commentNickname}>{comment.nickname}</span>
        <span style={styles.commentTime}>
          {new Date(comment.createdAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
        {isOwn && (
          <button style={styles.commentDeleteBtn} onClick={() => onDelete(comment.id)}>삭제</button>
        )}
      </div>
      <div style={styles.commentContent}>{comment.content}</div>
    </div>
  )
}

export default function DetailModal({ post, onClose, onJoin, currentMemberId }) {
  if (!post) return null

  const avail = post.seats - post.filled
  const full = avail <= 0

  const [comments, setComments] = useState([])
  const [commentInput, setCommentInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loadingComments, setLoadingComments] = useState(true)

  const loadComments = useCallback(async () => {
    try {
      setLoadingComments(true)
      const data = await fetchComments(post.id)
      setComments(data || [])
    } catch {
      setComments([])
    } finally {
      setLoadingComments(false)
    }
  }, [post.id])

  useEffect(() => {
    loadComments()
  }, [loadComments])

  async function handleSubmitComment() {
    const text = commentInput.trim()
    if (!text) return
    try {
      setSubmitting(true)
      const created = await createComment(post.id, text)
      setComments(prev => [...prev, created])
      setCommentInput('')
    } catch {
      // silent fail
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteComment(commentId) {
    try {
      await removeComment(commentId)
      setComments(prev => prev.filter(c => c.id !== commentId))
    } catch {
      // silent fail
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmitComment()
    }
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div style={styles.overlay} onClick={handleOverlayClick}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.title}>카풀 상세</div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <RouteMap
          fromLat={post.departureLat}
          fromLng={post.departureLng}
          toLat={post.destinationLat}
          toLng={post.destinationLng}
        />

        <div style={styles.routeSection}>
          <div style={styles.route}>
            <span>{post.from}</span>
            <span style={{ color: 'var(--accent)' }}>→</span>
            <span>{post.to}</span>
          </div>
          <div style={styles.metaGrid}>
            <MetaItem label="날짜" value={post.date} />
            <MetaItem label="시간" value={post.time} />
            <MetaItem label="모집 인원" value={`${post.seats}명 (${post.filled}명 참여중)`} />
            <MetaItem label="1인 분담금" value={fmtPrice(post.price)} accent />
          </div>
          {post.tags?.length > 0 && (
            <div style={styles.tags}>
              {post.tags.map(tid => {
                const t = TAG_MAP[tid]
                if (!t) return null
                return (
                  <span key={tid} style={{ ...styles.tagPill, background: t.bg, color: t.tc, borderColor: `${t.tc}22` }}>
                    {t.emoji} {t.label}
                  </span>
                )
              })}
            </div>
          )}
          {post.desc && (
            <div style={styles.desc}>{post.desc}</div>
          )}
        </div>

        <div style={styles.driverSection}>
          <div style={{ ...styles.driverAvatar, background: `${post.color}22`, color: post.color }}>
            {(post.nickname || '?')[0]}
          </div>
          <div>
            <div style={styles.driverName}>{post.nickname || '익명'}</div>
            <div style={styles.driverRating}>★★★★★ {post.rating}</div>
            <div style={styles.driverTrips}>총 {post.trips}회 탑승</div>
          </div>
        </div>

        {/* 댓글 섹션 */}
        <div style={styles.commentSection}>
          <div style={styles.commentHeader}>
            <span>댓글</span>
            <span style={styles.commentBadge}>{comments.length}개</span>
          </div>

          <div style={styles.commentList}>
            {loadingComments ? (
              <div style={styles.commentEmpty}>불러오는 중...</div>
            ) : comments.length === 0 ? (
              <div style={styles.commentEmpty}>첫 댓글을 남겨보세요!</div>
            ) : (
              comments.map(c => (
                <CommentItem
                  key={c.id}
                  comment={c}
                  currentMemberId={currentMemberId}
                  onDelete={handleDeleteComment}
                />
              ))
            )}
          </div>

          <div style={styles.commentInputRow}>
            <input
              style={styles.commentInput}
              placeholder="댓글을 입력하세요 (Enter로 전송)"
              value={commentInput}
              onChange={e => setCommentInput(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={500}
              disabled={submitting}
            />
            <button
              style={{ ...styles.commentSendBtn, ...(submitting || !commentInput.trim() ? styles.commentSendBtnDisabled : {}) }}
              onClick={handleSubmitComment}
              disabled={submitting || !commentInput.trim()}
            >
              전송
            </button>
          </div>
        </div>

        <button
          style={{ ...styles.joinBtn, ...(full ? styles.joinBtnDisabled : {}) }}
          disabled={full}
          onClick={() => onJoin(post.id)}
        >
          {full ? '마감된 카풀입니다' : '참여 신청하기'}
        </button>
      </div>
    </div>
  )
}

function MetaItem({ label, value, accent }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: accent ? 'var(--accent)' : 'var(--text)' }}>{value}</span>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 600,
    background: 'rgba(42,42,31,0.5)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
  },
  modal: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 20,
    width: '100%',
    maxWidth: 540,
    maxHeight: '92vh',
    overflowY: 'auto',
    padding: '2rem',
    boxShadow: '0 20px 60px rgba(42,42,31,0.15)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.2rem',
  },
  title: {
    fontSize: '1.2rem',
    fontWeight: 700,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: '1.3rem',
    padding: '0.3rem',
    borderRadius: 6,
  },
  routeSection: {
    background: 'var(--surface2)',
    borderRadius: 12,
    padding: '1.2rem',
    marginBottom: '1.2rem',
  },
  route: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    fontSize: '1.1rem',
    fontWeight: 700,
    marginBottom: '0.8rem',
    color: 'var(--text)',
  },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.6rem',
  },
  tags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.4rem',
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid var(--border)',
  },
  tagPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    fontSize: '0.72rem',
    fontWeight: 600,
    padding: '0.22rem 0.6rem',
    borderRadius: 100,
    border: '1.5px solid',
  },
  desc: {
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid var(--border)',
    fontSize: '0.87rem',
    color: 'var(--text-muted)',
    lineHeight: 1.7,
  },
  driverSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    background: 'var(--surface2)',
    borderRadius: 12,
    padding: '1rem 1.2rem',
    marginBottom: '1.2rem',
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.1rem',
    fontWeight: 700,
    flexShrink: 0,
  },
  driverName: {
    fontWeight: 700,
    marginBottom: '0.2rem',
    color: 'var(--text)',
  },
  driverRating: {
    fontSize: '0.82rem',
    color: '#b8860b',
  },
  driverTrips: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  commentSection: {
    background: 'var(--surface2)',
    borderRadius: 12,
    padding: '1rem 1.2rem',
    marginBottom: '1.2rem',
  },
  commentHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontWeight: 700,
    fontSize: '0.9rem',
    marginBottom: '0.8rem',
    color: 'var(--text)',
  },
  commentBadge: {
    fontSize: '0.68rem',
    fontWeight: 600,
    padding: '0.15rem 0.5rem',
    borderRadius: 100,
    background: 'var(--accent-pale)',
    color: 'var(--accent)',
  },
  commentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
    marginBottom: '0.8rem',
    maxHeight: 200,
    overflowY: 'auto',
  },
  commentItem: {
    background: 'var(--surface)',
    borderRadius: 8,
    padding: '0.6rem 0.8rem',
  },
  commentMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.25rem',
  },
  commentNickname: {
    fontSize: '0.78rem',
    fontWeight: 700,
    color: 'var(--text)',
  },
  commentTime: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    flex: 1,
  },
  commentDeleteBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: '0.7rem',
    cursor: 'pointer',
    padding: '0.1rem 0.3rem',
    borderRadius: 4,
  },
  commentContent: {
    fontSize: '0.85rem',
    color: 'var(--text)',
    lineHeight: 1.5,
  },
  commentEmpty: {
    fontSize: '0.82rem',
    color: 'var(--text-muted)',
    padding: '0.8rem 0',
    textAlign: 'center',
  },
  commentInputRow: {
    display: 'flex',
    gap: '0.5rem',
  },
  commentInput: {
    flex: 1,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '0.55rem 0.9rem',
    fontSize: '0.85rem',
    color: 'var(--text)',
    outline: 'none',
  },
  commentSendBtn: {
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '0.55rem 1rem',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  commentSendBtnDisabled: {
    background: 'var(--border)',
    color: 'var(--text-muted)',
    cursor: 'not-allowed',
  },
  joinBtn: {
    width: '100%',
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '1rem',
    padding: '0.85rem',
    borderRadius: 10,
    transition: 'all 0.2s',
  },
  joinBtnDisabled: {
    background: 'var(--border)',
    color: 'var(--text-muted)',
    cursor: 'not-allowed',
  },
}
