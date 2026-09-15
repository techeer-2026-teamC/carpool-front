import React, { Suspense, lazy, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api, captureAuthorization, clearAuthorization, getToken, setAccessToken, syncExternalAuthorization } from '../api/client'
import AppShell from '../features/shell/AppShell'
import SearchPage from '../features/discovery/SearchPage'
import AuthDialog from '../features/auth/AuthDialog'
import { NotificationProvider, useNotifications } from '../features/notifications/NotificationProvider'
import { EmptyState, ErrorNotice, Loading } from '../features/shared/Feedback'

const MyTrips = lazy(() => import('../features/recruitment/MyTrips'))
const PostEditor = lazy(() => import('../features/recruitment/PostEditor'))
const TripDetail = lazy(() => import('../features/trips/TripDetail'))
const NotificationPage = lazy(() => import('../features/notifications/NotificationPage'))
const AccountPage = lazy(() => import('../features/account/AccountPage'))

function currentMember() {
  try {
    const payload = JSON.parse(atob(getToken().split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.token_use === 'access' ? payload.memberId : null
  } catch { return null }
}

function Pages({ memberId, onLogin }) {
  const navigate = useNavigate()
  const location = useLocation()
  useEffect(() => { window.scrollTo({ top: 0, left: 0 }) }, [location.pathname])
  const [revision, setRevision] = useState(0)
  const [editor, setEditor] = useState(null)
  const [error, setError] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  const { unreadCount } = useNotifications()
  const postId = new URLSearchParams(location.search).get('post')
  const onChanged = () => setRevision(value => value + 1)
  const open = id => navigate(`${location.pathname}?post=${encodeURIComponent(id)}`)
  const close = () => navigate(location.pathname)
  const create = () => memberId ? setEditor({ post: null, frozen: false }) : onLogin()
  useEffect(() => { setEditor(null); setError('') }, [memberId])
  async function logout() {
    if (loggingOut) return
    const isCurrent = captureAuthorization()
    setLoggingOut(true); setError('')
    try { await api.post('/auth/logout') }
    catch (e) { if (isCurrent()) setError(`서버 연결을 확인할 수 없어 이 기기에서 로그아웃했습니다. ${e.message}`) }
    finally { if (isCurrent()) { clearAuthorization(); setLoggingOut(false); navigate('/') } }
  }
  const protectedPage = ['/my', '/notifications', '/profile'].includes(location.pathname)
  return <AppShell memberId={memberId} unreadCount={unreadCount} onCreate={create} onLogout={logout} onLogin={onLogin}>
    <ErrorNotice error={error} />
    <Suspense fallback={<Loading />}>
      {protectedPage && !memberId ? <section className="page-section"><EmptyState title="로그인하고 나의 동행을 확인하세요"><button className="button primary" onClick={onLogin}>로그인</button></EmptyState></section>
        : location.pathname === '/my' ? <MyTrips memberId={memberId} revision={revision} onOpen={open} />
        : location.pathname === '/notifications' ? <NotificationPage onOpen={open} />
        : location.pathname === '/profile' ? <AccountPage onWithdraw={() => { clearAuthorization(); navigate('/') }} />
        : location.pathname === '/' ? <SearchPage memberId={memberId} revision={revision} onOpen={open} onCreate={create} />
        : <section className="page-section"><EmptyState title="페이지를 찾을 수 없어요"><button className="button primary" onClick={() => navigate('/')}>동행 찾기로 돌아가기</button></EmptyState></section>}
      {postId && !editor && <TripDetail key={`${memberId}-${postId}`} postId={postId} memberId={memberId} revision={revision} onClose={close} onChanged={onChanged} onLogin={onLogin} onEdit={(post, frozen) => setEditor({ post, frozen })} />}
      {editor && <PostEditor {...editor} onClose={() => setEditor(null)} onSaved={post => { onChanged(); if (post?.id) open(post.id) }} />}
    </Suspense>
  </AppShell>
}

export default function App() {
  const [memberId, setMemberId] = useState(currentMember)
  const [login, setLogin] = useState(false)
  useEffect(() => {
    const sync = () => { setMemberId(currentMember()); setLogin(false) }
    const storage = event => {
      if (event.key === 'accessToken' || event.key === null) { syncExternalAuthorization(event); sync() }
    }
    window.addEventListener('auth:token', sync)
    window.addEventListener('auth:logout', sync)
    window.addEventListener('storage', storage)
    return () => {
      window.removeEventListener('auth:token', sync)
      window.removeEventListener('auth:logout', sync)
      window.removeEventListener('storage', storage)
    }
  }, [])
  return <NotificationProvider memberId={memberId}><Pages key={memberId || 'guest'} memberId={memberId} onLogin={() => setLogin(true)} />
    {login && <AuthDialog onClose={() => setLogin(false)} onLogin={token => { setAccessToken(token); setLogin(false) }} />}
  </NotificationProvider>
}
