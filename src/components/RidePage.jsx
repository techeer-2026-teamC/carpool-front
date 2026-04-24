import React from 'react'

export default function RidePage({ memberId }) {
  return (
    <div style={styles.page}>
      {/* 내 운행 (드라이버) */}
      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.dot} />
          <h2 style={styles.cardTitle}>내 운행 (드라이버)</h2>
          <span style={styles.apiBadge}>API 연동 예정</span>
        </div>
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>🚗</div>
          <p style={styles.emptyText}>운행 API 개발 후 여기에 표시됩니다</p>
          <p style={styles.emptyDesc}>
            <code>GET /api/v1/rides/me</code> 연동 예정
          </p>
          <div style={styles.mockRide}>
            <div style={styles.mockRideTop}>
              <span style={styles.rideStatus}>대기 중</span>
              <span style={styles.rideRoute}>강남역 → 판교역</span>
            </div>
            <div style={styles.mockRideMeta}>
              <span>2025-05-01 08:30</span>
              <span>·</span>
              <span>3/4명 탑승</span>
            </div>
            <div style={styles.rideActions}>
              <button style={{ ...styles.actionBtn, opacity: 0.5, cursor: 'not-allowed' }} disabled>
                운행 시작
              </button>
              <button style={{ ...styles.actionBtn, ...styles.actionBtnDanger, opacity: 0.5, cursor: 'not-allowed' }} disabled>
                취소
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 탑승 내역 (승객) */}
      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.dot} />
          <h2 style={styles.cardTitle}>내 탑승 내역 (승객)</h2>
          <span style={styles.apiBadge}>API 연동 예정</span>
        </div>
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>🧳</div>
          <p style={styles.emptyText}>탑승 내역이 없습니다</p>
          <p style={styles.emptyDesc}>
            <code>GET /api/v1/rides/me?role=passenger</code> 연동 예정
          </p>
        </div>
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
              <code style={styles.wsCode}>/app/ride/{'{rideId}'}/location</code>
            </div>
          </div>
          <div style={styles.wsRow}>
            <span style={styles.wsIcon}>📍</span>
            <div>
              <div style={styles.wsTitle}>서버 → 승객 위치 브로드캐스트</div>
              <code style={styles.wsCode}>/topic/ride/{'{rideId}'}</code>
            </div>
          </div>
        </div>
        <div style={styles.infoBox}>
          WebSocket (STOMP) 백엔드 구현 후 실시간 드라이버 위치가 지도에 표시됩니다.
        </div>
      </section>
    </div>
  )
}

const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    maxWidth: 680,
  },
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: '1.5rem',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1.2rem',
  },
  dot: {
    width: 7,
    height: 7,
    background: 'var(--accent)',
    borderRadius: '50%',
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    color: 'var(--text)',
    margin: 0,
  },
  apiBadge: {
    fontSize: '0.68rem',
    fontWeight: 600,
    padding: '0.15rem 0.5rem',
    borderRadius: 100,
    background: 'rgba(192,57,43,0.08)',
    color: 'var(--accent3, #c0392b)',
    marginLeft: 'auto',
  },
  empty: {
    textAlign: 'center',
    padding: '1.5rem 1rem',
    color: 'var(--text-muted)',
  },
  emptyIcon: {
    fontSize: '2rem',
    marginBottom: '0.6rem',
    opacity: 0.4,
  },
  emptyText: {
    fontWeight: 600,
    marginBottom: '0.3rem',
    fontSize: '0.9rem',
  },
  emptyDesc: {
    fontSize: '0.78rem',
    color: 'var(--text-dim, var(--text-muted))',
    marginBottom: '1rem',
  },
  mockRide: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '1rem',
    textAlign: 'left',
    opacity: 0.6,
  },
  mockRideTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    marginBottom: '0.4rem',
  },
  rideStatus: {
    fontSize: '0.7rem',
    fontWeight: 700,
    background: 'var(--accent-pale)',
    color: 'var(--accent)',
    padding: '0.15rem 0.5rem',
    borderRadius: 6,
  },
  rideRoute: {
    fontWeight: 700,
    fontSize: '0.9rem',
    color: 'var(--text)',
  },
  mockRideMeta: {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    display: 'flex',
    gap: '0.4rem',
    marginBottom: '0.8rem',
  },
  rideActions: {
    display: 'flex',
    gap: '0.5rem',
  },
  actionBtn: {
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 7,
    padding: '0.4rem 0.9rem',
    fontSize: '0.82rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  actionBtnDanger: {
    background: 'rgba(192,57,43,0.1)',
    color: 'var(--accent3, #c0392b)',
  },
  wsInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8rem',
    marginBottom: '1rem',
  },
  wsRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.7rem',
    background: 'var(--surface2)',
    borderRadius: 10,
    padding: '0.8rem 1rem',
  },
  wsIcon: {
    fontSize: '1.2rem',
    flexShrink: 0,
  },
  wsTitle: {
    fontSize: '0.82rem',
    fontWeight: 600,
    color: 'var(--text)',
    marginBottom: '0.2rem',
  },
  wsCode: {
    fontSize: '0.75rem',
    color: 'var(--accent)',
    background: 'var(--accent-pale)',
    padding: '0.1rem 0.4rem',
    borderRadius: 4,
  },
  infoBox: {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    background: 'var(--surface2)',
    borderRadius: 8,
    padding: '0.65rem 0.9rem',
    lineHeight: 1.6,
  },
}
