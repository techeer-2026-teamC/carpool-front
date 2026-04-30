import React, { useState } from 'react'
import LoginPage from './components/LoginPage'
import Nav from './components/Nav'
import Hero from './components/Hero'
import SearchSection from './components/SearchSection'
import CarpoolCard from './components/CarpoolCard'
import MapView from './components/MapView'
import PostModal from './components/PostModal'
import DetailModal from './components/DetailModal'
import ProfilePage from './components/ProfilePage'
import RidePage from './components/RidePage'
import Toast from './components/Toast'
import { useCarpool } from './hooks/useCarpool'

function parseMemberId(token) {
  try {
    return JSON.parse(atob(token.split('.')[1])).memberId
  } catch {
    return null
  }
}

function getInitialAuth() {
  const token = localStorage.getItem('accessToken')
  if (!token) return { token: null, memberId: null }
  const memberId = parseMemberId(token)
  return memberId ? { token, memberId } : { token: null, memberId: null }
}

export default function App() {
  const [auth, setAuth] = useState(getInitialAuth)

  function handleLogin(token) {
    const memberId = parseMemberId(token)
    localStorage.setItem('accessToken', token)
    setAuth({ token, memberId })
  }

  function handleLogout() {
    localStorage.removeItem('accessToken')
    setAuth({ token: null, memberId: null })
  }

  const {
    posts,
    filteredPosts,
    myPosts,
    filteredMyPosts,
    loading,
    currentPage, setCurrentPage,
    currentView, setCurrentView,
    currentFilter, setCurrentFilter,
    searchQuery, setSearchQuery,
    selectedTagFilters,
    toggleTagFilter,
    clearTagFilters,
    toast,
    addPost,
    deletePost,
    joinCarpool,
  } = useCarpool(auth.memberId)

  const [showPostModal, setShowPostModal] = useState(false)
  const [selectedPostId, setSelectedPostId] = useState(null)

  const selectedPost = posts.find(p => p.id === selectedPostId) || null

  function handleOpenDetail(id) {
    setSelectedPostId(id)
  }

  function handleJoin(id) {
    joinCarpool(id)
    setSelectedPostId(null)
  }

  if (!auth.token) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <div>
      <Nav
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onOpenPost={() => setShowPostModal(true)}
        onLogout={handleLogout}
      />

      {currentPage === 'list' && (
        <Hero totalPosts={posts.length} />
      )}

      <div style={styles.main}>
        {(currentPage === 'list' || currentPage === 'my') && (
          <SearchSection
            onSearch={setSearchQuery}
            onClear={() => setSearchQuery({ from: '', to: '', date: '' })}
            selectedTagFilters={selectedTagFilters}
            onToggleTag={toggleTagFilter}
            onClearTags={clearTagFilters}
          />
        )}

        {currentPage === 'list' && (
          <>
            <div style={styles.toolbar}>
              <div style={styles.toolbarLeft}>
                <div style={styles.sectionTitle}>
                  <div style={styles.dot} />
                  <span>
                    카풀 목록 ({filteredPosts.length})
                    {selectedTagFilters.size > 0 && (
                      <span style={styles.tagCount}>{selectedTagFilters.size}</span>
                    )}
                  </span>
                </div>
                <div style={styles.filterRow}>
                  {[
                    { key: 'all', label: '전체' },
                    { key: 'today', label: '오늘' },
                    { key: 'seats', label: '자리있음' },
                    { key: 'cheap', label: '저렴순' },
                  ].map(f => (
                    <button
                      key={f.key}
                      style={{ ...styles.filterChip, ...(currentFilter === f.key ? styles.filterChipActive : {}) }}
                      onClick={() => setCurrentFilter(f.key)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={styles.viewToggle}>
                <button
                  style={{ ...styles.viewBtn, ...(currentView === 'card' ? styles.viewBtnActive : {}) }}
                  onClick={() => setCurrentView('card')}
                >
                  ⊞ 카드 보기
                </button>
                <button
                  style={{ ...styles.viewBtn, ...(currentView === 'map' ? styles.viewBtnActive : {}) }}
                  onClick={() => setCurrentView('map')}
                >
                  📍 지도 보기
                </button>
              </div>
            </div>

            {loading ? (
              <div style={styles.emptyState}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.4 }}>🚗</div>
                <p>불러오는 중...</p>
              </div>
            ) : currentView === 'card' ? (
              <div style={styles.cardsGrid}>
                {filteredPosts.length === 0 ? (
                  <div style={styles.emptyState}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.4 }}>🚗</div>
                    <p>조건에 맞는 카풀이 없습니다</p>
                  </div>
                ) : (
                  filteredPosts.map(p => (
                    <CarpoolCard key={p.id} post={p} onOpen={handleOpenDetail} />
                  ))
                )}
              </div>
            ) : (
              <MapView posts={filteredPosts} onOpenDetail={handleOpenDetail} />
            )}
          </>
        )}

        {currentPage === 'my' && (
          <>
            <div style={styles.toolbar}>
              <div style={styles.sectionTitle}>
                <div style={styles.dot} />
                내가 등록한 카풀
              </div>
            </div>
            <div style={styles.cardsGrid}>
              {filteredMyPosts.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.4 }}>📝</div>
                  <p>{myPosts.length === 0 ? '등록한 카풀이 없습니다' : '조건에 맞는 카풀이 없습니다'}</p>
                </div>
              ) : (
                filteredMyPosts.map(p => (
                  <CarpoolCard
                    key={p.id}
                    post={p}
                    onOpen={handleOpenDetail}
                    onDelete={deletePost}
                    showDelete
                  />
                ))
              )}
            </div>
          </>
        )}

        {currentPage === 'profile' && (
          <ProfilePage onLogout={handleLogout} />
        )}

        {currentPage === 'rides' && (
          <RidePage memberId={auth.memberId} />
        )}
      </div>

      {showPostModal && (
        <PostModal
          onClose={() => setShowPostModal(false)}
          onSubmit={addPost}
        />
      )}
      {selectedPost && (
        <DetailModal
          post={selectedPost}
          onClose={() => setSelectedPostId(null)}
          onJoin={handleJoin}
          currentMemberId={auth.memberId}
        />
      )}

      <Toast message={toast} />
    </div>
  )
}

const styles = {
  main: {
    position: 'relative',
    zIndex: 1,
    maxWidth: 1300,
    margin: '0 auto',
    padding: '1.5rem 2rem 2rem',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    flexWrap: 'wrap',
    gap: '0.8rem',
    marginTop: '1rem',
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.8rem',
    flexWrap: 'wrap',
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: 'var(--text)',
  },
  dot: {
    width: 7,
    height: 7,
    background: 'var(--accent)',
    borderRadius: '50%',
  },
  tagCount: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: 'var(--accent)',
    color: '#fff',
    fontSize: '0.65rem',
    fontWeight: 700,
    marginLeft: '0.3rem',
  },
  filterRow: {
    display: 'flex',
    gap: '0.35rem',
    flexWrap: 'wrap',
  },
  filterChip: {
    background: 'none',
    border: '1px solid var(--border)',
    color: 'var(--text-muted)',
    fontSize: '0.76rem',
    padding: '0.28rem 0.75rem',
    borderRadius: 100,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  filterChipActive: {
    borderColor: 'var(--accent)',
    color: 'var(--accent)',
    background: 'var(--accent-pale)',
  },
  viewToggle: {
    display: 'flex',
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  viewBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0.4rem 1rem',
    borderRadius: 7,
    fontSize: '0.82rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    transition: 'all 0.2s',
  },
  viewBtnActive: {
    background: 'var(--surface)',
    color: 'var(--accent)',
    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
    gap: '1rem',
    marginBottom: '3rem',
  },
  emptyState: {
    textAlign: 'center',
    padding: '4rem 2rem',
    color: 'var(--text-muted)',
    gridColumn: '1 / -1',
  },
}
