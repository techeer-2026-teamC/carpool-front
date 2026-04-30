import React from 'react'

const NAV_TABS = [
  { key: 'list',    label: '카풀 찾기' },
  { key: 'my',      label: '내 카풀' },
  { key: 'rides',   label: '내 운행' },
  { key: 'profile', label: '프로필' },
]

export default function Nav({ currentPage, onPageChange, onOpenPost, onLogout }) {
  return (
    <nav style={styles.nav}>
      <div style={styles.logo} onClick={() => onPageChange('list')}>
        같이<span style={{ color: 'var(--text)' }}>타</span>
      </div>
      <div style={styles.navLinks}>
        {NAV_TABS.map(t => (
          <button
            key={t.key}
            style={{ ...styles.navTab, ...(currentPage === t.key ? styles.navTabActive : {}) }}
            onClick={() => onPageChange(t.key)}
          >
            {t.label}
          </button>
        ))}
        <button style={styles.btnPrimary} onClick={onOpenPost}>
          + 게시글 등록
        </button>
        <button style={styles.btnLogout} onClick={onLogout}>
          로그아웃
        </button>
      </div>
    </nav>
  )
}

const styles = {
  nav: {
    position: 'sticky',
    top: 0,
    zIndex: 500,
    background: 'rgba(247,246,242,0.95)',
    backdropFilter: 'blur(16px)',
    borderBottom: '1px solid var(--border)',
    padding: '0 2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 64,
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  logo: {
    fontFamily: "'Space Mono', monospace",
    fontSize: '1.3rem',
    fontWeight: 700,
    color: 'var(--accent)',
    letterSpacing: '-0.5px',
    cursor: 'pointer',
  },
  navLinks: {
    display: 'flex',
    gap: '0.3rem',
    alignItems: 'center',
  },
  navTab: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    fontSize: '0.88rem',
    padding: '0.45rem 0.85rem',
    borderRadius: 8,
    transition: 'all 0.2s',
  },
  navTabActive: {
    background: 'var(--accent-pale)',
    color: 'var(--accent)',
    fontWeight: 600,
  },
  btnPrimary: {
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '0.88rem',
    padding: '0.5rem 1.1rem',
    borderRadius: 8,
    transition: 'all 0.2s',
    marginLeft: '0.4rem',
  },
  btnLogout: {
    background: 'none',
    border: '1px solid var(--border)',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    fontSize: '0.82rem',
    padding: '0.42rem 0.8rem',
    borderRadius: 8,
    transition: 'all 0.2s',
  },
}
