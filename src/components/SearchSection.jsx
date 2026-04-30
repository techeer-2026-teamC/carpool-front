import React, { useState } from 'react'
import { ALL_TAGS } from '../data/tags'

export default function SearchSection({ onSearch, onClear, selectedTagFilters, onToggleTag, onClearTags }) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [date, setDate] = useState('')

  function handleSearch() {
    onSearch({ from, to, date })
  }

  function handleClear() {
    setFrom('')
    setTo('')
    setDate('')
    onClear()
  }

  return (
    <div style={styles.section}>
      <div style={styles.searchTop}>
        <div style={styles.field}>
          <label style={styles.label}>출발지</label>
          <input
            style={styles.input}
            value={from}
            onChange={e => setFrom(e.target.value)}
            placeholder="예: 강남역"
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>목적지</label>
          <input
            style={styles.input}
            value={to}
            onChange={e => setTo(e.target.value)}
            placeholder="예: 판교역"
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <div style={{ ...styles.field, maxWidth: 140 }}>
          <label style={styles.label}>날짜</label>
          <input
            style={styles.input}
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>
        <button style={styles.searchBtn} onClick={handleSearch}>🔍 검색</button>
        <button style={styles.resetBtn} onClick={handleClear}>초기화</button>
      </div>

      {/* 태그 필터 */}
      <div style={styles.tagStrip}>
        <span style={styles.tagLabel}>태그 필터</span>
        {ALL_TAGS.map(t => {
          const active = selectedTagFilters.has(t.id)
          return (
            <button
              key={t.id}
              onClick={() => onToggleTag(t.id)}
              style={{
                ...styles.tagBtn,
                ...(active ? { background: t.bg, color: t.tc, border: `1.5px solid ${t.tc}` } : {}),
              }}
            >
              {t.emoji} {t.label}
            </button>
          )
        })}
        {selectedTagFilters.size > 0 && (
          <button style={styles.clearBtn} onClick={onClearTags}>✕ 태그 초기화</button>
        )}
      </div>
    </div>
  )
}

const styles = {
  section: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: '1.2rem 1.5rem 1rem',
    marginBottom: '0.8rem',
    boxShadow: '0 2px 12px rgba(107,124,63,0.06)',
  },
  searchTop: {
    display: 'flex',
    gap: '0.8rem',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    marginBottom: '0.9rem',
  },
  field: {
    flex: 1,
    minWidth: 140,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
  },
  label: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    fontWeight: 600,
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  input: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '0.6rem 0.9rem',
    color: 'var(--text)',
    fontSize: '0.88rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  searchBtn: {
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '0.88rem',
    padding: '0.6rem 1.5rem',
    borderRadius: 10,
    whiteSpace: 'nowrap',
    alignSelf: 'flex-end',
  },
  resetBtn: {
    background: 'var(--surface2)',
    color: 'var(--text-muted)',
    border: '1px solid var(--border)',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '0.88rem',
    padding: '0.6rem 1.5rem',
    borderRadius: 10,
    whiteSpace: 'nowrap',
    alignSelf: 'flex-end',
  },
  tagStrip: {
    borderTop: '1px solid var(--border)',
    paddingTop: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  tagLabel: {
    fontSize: '0.7rem',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    whiteSpace: 'nowrap',
    marginRight: '0.2rem',
  },
  tagBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3rem',
    border: '1.5px solid var(--border)',
    background: 'none',
    color: 'var(--text-muted)',
    fontSize: '0.78rem',
    fontWeight: 500,
    padding: '0.3rem 0.7rem',
    borderRadius: 100,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.18s',
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.72rem',
    color: 'var(--text-dim)',
    padding: '0.3rem 0.4rem',
    borderRadius: 6,
    marginLeft: 'auto',
  },
}
