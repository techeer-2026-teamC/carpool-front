import React, { useState } from 'react'

export default function ProfilePage({ memberId }) {
  const [vehicleForm, setVehicleForm] = useState({
    type: 'sedan',
    model: '',
    plateNumber: '',
    color: '',
    maxSeats: '4',
  })
  const [vehicleSubmitted, setVehicleSubmitted] = useState(false)

  function setField(key, val) {
    setVehicleForm(prev => ({ ...prev, [key]: val }))
  }

  function handleVehicleSubmit() {
    // TODO: POST /api/v1/vehicles 연동 예정
    setVehicleSubmitted(true)
    setTimeout(() => setVehicleSubmitted(false), 2000)
  }

  return (
    <div style={styles.page}>
      {/* 프로필 섹션 */}
      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.dot} />
          <h2 style={styles.cardTitle}>내 프로필</h2>
          <span style={styles.apiBadge}>API 연동 예정</span>
        </div>
        <div style={styles.profileRow}>
          <div style={styles.avatar}>?</div>
          <div>
            <div style={styles.profileName}>닉네임 (불러오는 중)</div>
            <div style={styles.profileMeta}>회원 ID: {memberId}</div>
            <div style={styles.profileMeta}>이메일: (프로필 API 연동 후 표시)</div>
          </div>
        </div>
        <div style={styles.infoBox}>
          프로필 조회/수정 API (<code>GET/PUT /api/v1/members/{'{id}'}</code>) 개발 후 연동됩니다.
        </div>
      </section>

      {/* 차량 등록 섹션 */}
      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.dot} />
          <h2 style={styles.cardTitle}>차량 등록 (드라이버 등록)</h2>
          <span style={styles.apiBadge}>API 연동 예정</span>
        </div>
        <p style={styles.desc}>차량을 등록하면 카풀 게시글을 작성할 수 있습니다.</p>

        <div style={styles.formGrid}>
          <FormGroup label="차종">
            <select style={styles.input} value={vehicleForm.type} onChange={e => setField('type', e.target.value)}>
              <option value="sedan">승용차</option>
              <option value="suv">SUV</option>
              <option value="van">밴/미니밴</option>
            </select>
          </FormGroup>
          <FormGroup label="차량 모델">
            <input
              style={styles.input}
              placeholder="예: 현대 아반떼"
              value={vehicleForm.model}
              onChange={e => setField('model', e.target.value)}
            />
          </FormGroup>
          <FormGroup label="차량 번호">
            <input
              style={styles.input}
              placeholder="예: 12가 3456"
              value={vehicleForm.plateNumber}
              onChange={e => setField('plateNumber', e.target.value)}
            />
          </FormGroup>
          <FormGroup label="색상">
            <input
              style={styles.input}
              placeholder="예: 흰색"
              value={vehicleForm.color}
              onChange={e => setField('color', e.target.value)}
            />
          </FormGroup>
          <FormGroup label="최대 탑승 인원">
            <select style={styles.input} value={vehicleForm.maxSeats} onChange={e => setField('maxSeats', e.target.value)}>
              {['2', '3', '4', '5', '6', '7'].map(n => (
                <option key={n} value={n}>{n}명</option>
              ))}
            </select>
          </FormGroup>
        </div>

        <button
          style={{ ...styles.submitBtn, opacity: 0.6, cursor: 'not-allowed' }}
          onClick={handleVehicleSubmit}
          disabled
          title="차량 등록 API 개발 후 활성화"
        >
          {vehicleSubmitted ? '등록 완료!' : '차량 등록하기 (준비 중)'}
        </button>
        <div style={styles.infoBox}>
          차량 등록 API (<code>POST /api/v1/vehicles</code>) 개발 후 활성화됩니다.
        </div>
      </section>
    </div>
  )
}

function FormGroup({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <label style={{
        fontSize: '0.75rem',
        fontWeight: 600,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>
        {label}
      </label>
      {children}
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
  profileRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1rem',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: 'var(--accent-pale)',
    color: 'var(--accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.4rem',
    fontWeight: 700,
    flexShrink: 0,
  },
  profileName: {
    fontWeight: 700,
    fontSize: '1.05rem',
    color: 'var(--text)',
    marginBottom: '0.3rem',
  },
  profileMeta: {
    fontSize: '0.82rem',
    color: 'var(--text-muted)',
    marginBottom: '0.15rem',
  },
  desc: {
    fontSize: '0.87rem',
    color: 'var(--text-muted)',
    marginBottom: '1.2rem',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.9rem',
    marginBottom: '1.2rem',
  },
  input: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '0.65rem 0.9rem',
    color: 'var(--text)',
    fontSize: '0.88rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  submitBtn: {
    width: '100%',
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '0.95rem',
    padding: '0.8rem',
    borderRadius: 10,
    marginBottom: '0.8rem',
    transition: 'all 0.2s',
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
