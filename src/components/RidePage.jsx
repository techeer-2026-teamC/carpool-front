import React, { useEffect, useState } from 'react'
import { getMyRidesAsDriver, getMyRidesAsPassenger, startRide, completeRide } from '../api/rides'

function RideStatusBadge({ status }) {
  const map = {
    SCHEDULED:   { label: '예정', bg: 'var(--accent-pale)', color: 'var(--accent)' },
    IN_PROGRESS: { label: '운행 중', bg: 'rgba(39,174,96,0.1)', color: '#27ae60' },
    COMPLETED:   { label: '완료', bg: 'var(--surface2)', color: 'var(--text-muted)' },
  }
  const s = map[status] || { label: status, bg: 'var(--surface2)', color: 'var(--text-muted)' }
  return <span style={{ ...styles.badge, background: s.bg, color: s.color }}>{s.label}</span>
}

function RideCard({ ride, isDriver, onStart, onComplete }) {
  return (
    <div style={styles.rideCard}>
      <div style={styles.rideTop}>
        <RideStatusBadge status={ride.status} />
        <span style={styles.rideId}>운행 #{ride.id}</span>
      </div>
      <div style={styles.rideMeta}>게시글 ID: {ride.postId}</div>
      {ride.startedAt && (
        <div style={styles.rideMeta}>
          출발: {new Date(ride.startedAt).toLocaleString('ko-KR')}
        </div>
      )}
      {ride.completedAt && (
        <div style={styles.rideMeta}>
          완료: {new Date(ride.completedAt).toLocaleString('ko-KR')}
        </div>
      )}
      {isDriver && ride.status === 'SCHEDULED' && (
        <button style={styles.actionBtn} onClick={() => onStart(ride.id)}>운행 시작</button>
      )}
      {isDriver && ride.status === 'IN_PROGRESS' && (
        <button style={{ ...styles.actionBtn, ...styles.actionBtnDanger }} onClick={() => onComplete(ride.id)}>
          운행 종료
        </button>
      )}
    </div>
  )
}

export default function RidePage({ memberId }) {
  const [driverRides, setDriverRides] = useState([])
  const [passengerRides, setPassengerRides] = useState([])
  const [loadingDriver, setLoadingDriver] = useState(true)
  const [loadingPassenger, setLoadingPassenger] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getMyRidesAsDriver()
      .then(data => setDriverRides(data || []))
      .catch(() => setError('운행 목록을 불러오지 못했습니다.'))
      .finally(() => setLoadingDriver(false))

    getMyRidesAsPassenger()
      .then(data => setPassengerRides(data || []))
      .catch(() => {})
      .finally(() => setLoadingPassenger(false))
  }, [])

  async function handleStart(rideId) {
    try {
      const updated = await startRide(rideId)
      setDriverRides(prev => prev.map(r => r.id === rideId ? updated : r))
    } catch (e) {
      setError(e.message || '운행 시작에 실패했습니다.')
    }
  }

  async function handleComplete(rideId) {
    try {
      const updated = await completeRide(rideId)
      setDriverRides(prev => prev.map(r => r.id === rideId ? updated : r))
    } catch (e) {
      setError(e.message || '운행 종료에 실패했습니다.')
    }
  }

  return (
    <div style={styles.page}>
      {error && <div style={styles.errorBox}>{error}</div>}

      {/* 내 운행 (드라이버) */}
      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.dot} />
          <h2 style={styles.cardTitle}>내 운행 (드라이버)</h2>
        </div>
        {loadingDriver ? (
          <div style={styles.empty}><p style={styles.emptyText}>불러오는 중...</p></div>
        ) : driverRides.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>🚗</div>
            <p style={styles.emptyText}>등록된 운행이 없습니다</p>
          </div>
        ) : (
          <div style={styles.rideList}>
            {driverRides.map(r => (
              <RideCard key={r.id} ride={r} isDriver onStart={handleStart} onComplete={handleComplete} />
            ))}
          </div>
        )}
      </section>

      {/* 탑승 내역 (승객) */}
      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.dot} />
          <h2 style={styles.cardTitle}>내 탑승 내역 (승객)</h2>
        </div>
        {loadingPassenger ? (
          <div style={styles.empty}><p style={styles.emptyText}>불러오는 중...</p></div>
        ) : passengerRides.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>🧳</div>
            <p style={styles.emptyText}>탑승 내역이 없습니다</p>
          </div>
        ) : (
          <div style={styles.rideList}>
            {passengerRides.map(r => (
              <RideCard key={r.id} ride={r} isDriver={false} />
            ))}
          </div>
        )}
      </section>

      {/* 실시간 위치 안내 */}
      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.dot} />
          <h2 style={styles.cardTitle}>실시간 위치 추적</h2>
          <span style={styles.apiBadge}>WebSocket 연동 예정</span>
        </div>
        <div style={styles.wsInfo}>
          <div style={styles.wsRow}>
            <span style={styles.wsIcon}>📡</span>
            <div>
              <div style={styles.wsTitle}>드라이버 → 서버 위치 전송</div>
              <code style={styles.wsCode}>POST /api/v1/rides/{'{rideId}'}/location</code>
            </div>
          </div>
          <div style={styles.wsRow}>
            <span style={styles.wsIcon}>📍</span>
            <div>
              <div style={styles.wsTitle}>현재 드라이버 위치 조회</div>
              <code style={styles.wsCode}>GET /api/v1/rides/{'{rideId}'}/location</code>
            </div>
          </div>
        </div>
        <div style={styles.infoBox}>
          운행 중 드라이버 위치를 주기적으로 업데이트하면 탑승자에게 실시간 위치가 표시됩니다.
        </div>
      </section>
    </div>
  )
}

const styles = {
  page: { display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 680 },
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.2rem' },
  dot: { width: 7, height: 7, background: 'var(--accent)', borderRadius: '50%', flexShrink: 0 },
  cardTitle: { fontSize: '1rem', fontWeight: 700, color: 'var(--text)', margin: 0 },
  apiBadge: {
    fontSize: '0.68rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: 100,
    background: 'rgba(192,57,43,0.08)', color: 'var(--accent3, #c0392b)', marginLeft: 'auto',
  },
  empty: { textAlign: 'center', padding: '1.5rem 1rem', color: 'var(--text-muted)' },
  emptyIcon: { fontSize: '2rem', marginBottom: '0.6rem', opacity: 0.4 },
  emptyText: { fontWeight: 600, fontSize: '0.9rem', margin: 0 },
  errorBox: {
    color: 'var(--accent3, #c0392b)', fontSize: '0.85rem',
    background: 'rgba(192,57,43,0.06)', borderRadius: 10, padding: '0.8rem 1rem',
  },
  rideList: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  rideCard: {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '1rem',
  },
  rideTop: { display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' },
  badge: {
    fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem',
    borderRadius: 6, flexShrink: 0,
  },
  rideId: { fontSize: '0.78rem', color: 'var(--text-muted)' },
  rideMeta: { fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.2rem' },
  rideActions: { display: 'flex', gap: '0.5rem', marginTop: '0.8rem' },
  actionBtn: {
    marginTop: '0.8rem', background: 'var(--accent)', color: '#fff',
    border: 'none', borderRadius: 7, padding: '0.4rem 0.9rem',
    fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
  },
  actionBtnDanger: { background: 'rgba(192,57,43,0.1)', color: 'var(--accent3, #c0392b)' },
  wsInfo: { display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1rem' },
  wsRow: {
    display: 'flex', alignItems: 'flex-start', gap: '0.7rem',
    background: 'var(--surface2)', borderRadius: 10, padding: '0.8rem 1rem',
  },
  wsIcon: { fontSize: '1.2rem', flexShrink: 0 },
  wsTitle: { fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.2rem' },
  wsCode: {
    fontSize: '0.75rem', color: 'var(--accent)',
    background: 'var(--accent-pale)', padding: '0.1rem 0.4rem', borderRadius: 4,
  },
  infoBox: {
    fontSize: '0.78rem', color: 'var(--text-muted)',
    background: 'var(--surface2)', borderRadius: 8,
    padding: '0.65rem 0.9rem', lineHeight: 1.6,
  },
}
