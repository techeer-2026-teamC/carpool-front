import React, { useState } from 'react'
import { ALL_TAGS } from '../data/tags'
import { LOCATION_COORDS } from '../data/mockData'

export default function PostModal({ onClose, onSubmit }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    from: '', to: '', date: today, time: '',
    seats: '2', price: '', desc: '',
  })
  const [selectedTags, setSelectedTags] = useState(new Set())
  const [error, setError] = useState('')

  function set(key, val) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  function toggleTag(id) {
    setSelectedTags(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSubmit() {
    if (!form.from || !form.to || !form.date || !form.time) {
      setError('필수 항목을 모두 입력해주세요.')
      return
    }
    setError('')
    const fromCoords = LOCATION_COORDS[form.from] || null
    const toCoords = LOCATION_COORDS[form.to] || null
    onSubmit({
      ...form,
      seats: Number(form.seats),
      tags: [...selectedTags],
      departureLat: fromCoords ? fromCoords[0] : null,
      departureLng: fromCoords ? fromCoords[1] : null,
      destinationLat: toCoords ? toCoords[0] : null,
      destinationLng: toCoords ? toCoords[1] : null,
    })
    onClose()
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div style={styles.overlay} onClick={handleOverlayClick}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.title}>카풀 게시글 등록</div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.formRow}>
          <FormGroup label="출발지 *">
            <input style={styles.input} value={form.from} onChange={e => set('from', e.target.value)} placeholder="예: 강남역 3번 출구" />
          </FormGroup>
          <FormGroup label="목적지 *">
            <input style={styles.input} value={form.to} onChange={e => set('to', e.target.value)} placeholder="예: 판교역 2번 출구" />
          </FormGroup>
        </div>

        <div style={styles.formRow}>
          <FormGroup label="출발 날짜 *">
            <input style={styles.input} type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          </FormGroup>
          <FormGroup label="출발 시간 *">
            <input style={styles.input} type="time" value={form.time} onChange={e => set('time', e.target.value)} />
          </FormGroup>
        </div>

        <div style={styles.formRow}>
          <FormGroup label="모집 인원 *">
            <select style={styles.input} value={form.seats} onChange={e => set('seats', e.target.value)}>
              <option value="1">1명</option>
              <option value="2">2명</option>
              <option value="3">3명</option>
              <option value="4">4명</option>
            </select>
          </FormGroup>
          <FormGroup label="1인 분담금 (원)">
            <input style={styles.input} type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder="예: 5000" />
          </FormGroup>
        </div>

        <FormGroup label="추가 안내">
          <textarea style={{ ...styles.input, resize: 'vertical', minHeight: 76 }} value={form.desc} onChange={e => set('desc', e.target.value)} placeholder="경유지, 주의사항 등 자유롭게 적어주세요" />
        </FormGroup>

        {/* 태그 선택 */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={styles.label}>
            분위기 태그{' '}
            <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text-dim)', fontSize: '0.75rem' }}>
              (여러 개 선택 가능)
            </span>
          </label>
          <div style={styles.tagPicker}>
            {ALL_TAGS.map(t => {
              const sel = selectedTags.has(t.id)
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTag(t.id)}
                  style={{
                    ...styles.tagPickBtn,
                    ...(sel
                      ? { background: t.bg, color: t.tc, borderColor: t.tc }
                      : { color: t.tc, borderColor: t.bg, background: `${t.bg}44` }),
                  }}
                >
                  {t.emoji} {t.label}
                </button>
              )
            })}
          </div>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <button style={styles.submitBtn} onClick={handleSubmit}>
          게시글 등록하기
        </button>
      </div>
    </div>
  )
}

function FormGroup({ label, children }) {
  return (
    <div style={{ marginBottom: '1rem', flex: 1 }}>
      <label style={{
        display: 'block',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '0.45rem',
      }}>
        {label}
      </label>
      {children}
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
    marginBottom: '1.5rem',
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
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.8rem',
  },
  label: {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '0.45rem',
  },
  input: {
    width: '100%',
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '0.7rem 1rem',
    color: 'var(--text)',
    fontSize: '0.9rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  tagPicker: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.45rem',
    padding: '0.8rem',
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 10,
  },
  tagPickBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3rem',
    border: '1.5px solid',
    fontSize: '0.8rem',
    fontWeight: 500,
    padding: '0.32rem 0.75rem',
    borderRadius: 100,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.18s',
  },
  error: {
    color: 'var(--accent3)',
    fontSize: '0.82rem',
    marginBottom: '0.8rem',
    padding: '0.5rem 0.8rem',
    background: 'rgba(192,57,43,0.06)',
    borderRadius: 8,
  },
  submitBtn: {
    width: '100%',
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '1rem',
    padding: '0.85rem',
    borderRadius: 10,
    marginTop: '0.5rem',
    transition: 'all 0.2s',
  },
}
