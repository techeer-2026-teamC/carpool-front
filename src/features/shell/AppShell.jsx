import React from 'react'
import { Link, NavLink } from 'react-router-dom'
import '../../styles/moa.css'

const destinations = [
  { to: '/', label: '동행 찾기', icon: 'search' },
  { to: '/my', label: '나의 동행', icon: 'route' },
  { to: '/notifications', label: '알림', icon: 'bell' },
  { to: '/profile', label: '내 정보', icon: 'person' },
]

function Icon({ name }) {
  const paths = {
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
    route: <><circle cx="6" cy="5" r="2" /><circle cx="18" cy="19" r="2" /><path d="M6 7v6a4 4 0 0 0 4 4h4a4 4 0 0 0 0-8h-2M18 17v-4" /></>,
    bell: <><path d="M5 16h14l-2-3V9a5 5 0 0 0-10 0v4l-2 3ZM10 20h4" /><path d="M12 2v2" /></>,
    person: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>,
  }
  return <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function Navigation({ memberId, unreadCount, mobile = false }) {
  const count = Number.isFinite(Number(unreadCount)) ? Math.max(0, Math.floor(Number(unreadCount))) : 0
  return <nav className={mobile ? 'mobile-nav' : 'desktop-nav'} aria-label={mobile ? '모바일 주 메뉴' : '주 메뉴'}>
    {destinations.map(({ to, label, icon }) => {
      const text = to === '/profile' && !memberId ? '로그인' : label
      const hasUnread = to === '/notifications' && count > 0
      return <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} aria-label={hasUnread ? `${text}, 읽지 않은 알림 ${count}개` : text}>
        <span className="nav-symbol"><Icon name={icon} />{hasUnread && <span className="unread-badge" aria-hidden="true">{count > 99 ? '99+' : count}</span>}</span>
        <span>{text}</span>
      </NavLink>
    })}
  </nav>
}

export default function AppShell({ memberId, unreadCount = 0, onCreate, onLogin, onLogout, children }) {
  return <div className="moa-app">
    <a className="skip-link" href="#main-content">본문으로 건너뛰기</a>
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" to="/" aria-label="모아, 동행 찾기 홈">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>모아<span className="brand-dot">.</span></span>
        </Link>
        <Navigation memberId={memberId} unreadCount={unreadCount} />
        <div className="header-actions">
          {memberId ? <button className="text-button logout-button" type="button" onClick={onLogout}>로그아웃</button>
            : <button className="text-button login-button" type="button" onClick={onLogin}>로그인</button>}
          <button className="button primary create-button" type="button" onClick={onCreate}><span aria-hidden="true">＋</span> 모집하기</button>
        </div>
      </div>
    </header>
    <main className="main-content" id="main-content" tabIndex={-1}>{children}</main>
    <footer className="site-footer">
      <div className="footer-inner">
        <div><Link className="footer-brand" to="/">모아.</Link><p>같은 방향, 함께 가는 일상.</p></div>
        <div className="footer-policy"><strong>서로의 시간을 모아, 함께 출발해요.</strong><p>모아는 카풀·택시 동승자를 연결합니다. 참여는 모집자 승인 후 확정됩니다.<br />택시 호출과 결제는 제공하지 않으며, 이동과 비용 분담은 참여자 간에 진행합니다.</p><span>MOA · A LITTLE COMPANY, A BETTER JOURNEY</span></div>
      </div>
    </footer>
    <Navigation memberId={memberId} unreadCount={unreadCount} mobile />
  </div>
}
