import React, { useEffect, useRef, useState } from 'react'
import { api, captureAuthorization } from '../../api/client'
import { ErrorNotice, Loading } from '../shared/Feedback'
import Dialog from '../shared/Dialog'
import DriverForm from './DriverForm'
import PasswordInput from '../auth/PasswordInput'

export default function AccountPage({ onWithdraw }) {
  const [profile, setProfile] = useState(null)
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [retry, setRetry] = useState(0)
  const mounted = useRef(false)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => {
    const abort = new AbortController()
    setError('')
    api.get('/members/me', { signal: abort.signal }).then(({ data }) => {
      if (!abort.signal.aborted) { setProfile(data); setNickname(data.nickname) }
    }).catch(e => { if (!abort.signal.aborted) setError(e.message) })
    return () => abort.abort()
  }, [retry])
  async function save(event, body, success) {
    event.preventDefault()
    if (busy) return
    if (body.newPassword && password.newPassword !== password.confirm) { setError('새 비밀번호가 일치하지 않습니다.'); return }
    setBusy(true); setError(''); setMessage('')
    try {
      const { data } = await api.put('/members/me', body)
      setProfile(data); setMessage(success)
      if (body.newPassword) setPassword({ currentPassword: '', newPassword: '', confirm: '' })
    } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }
  async function withdraw() {
    if (busy) return
    const currentSession = captureAuthorization()
    const isCurrent = () => mounted.current && currentSession()
    setBusy(true); setError('')
    try { await api.delete('/members/me'); if (isCurrent()) onWithdraw() }
    catch (e) { if (isCurrent()) { setError(e.message); setConfirm(false) } }
    finally { if (isCurrent()) setBusy(false) }
  }
  return <section className="page-section"><span className="eyebrow">MY ACCOUNT</span><h1>내 정보</h1>
    <ErrorNotice error={error} retry={!profile ? () => setRetry(v => v + 1) : undefined} />
    {message && <p className="notice" role="status">{message}</p>}
    {!profile ? !error && <Loading /> : <div className="stack">
      <section className="section-card"><div className="card-host"><span className="avatar">{profile.nickname?.[0]}</span><div><h2>{profile.nickname}님</h2><p className="muted">{profile.email}</p></div></div>
        <form className="stack" onSubmit={e => save(e, { nickname: nickname.trim() }, '닉네임이 변경되었습니다.')}><label>닉네임<input required maxLength={30} value={nickname} onChange={e => setNickname(e.target.value)} /></label><button className="button secondary" disabled={busy}>닉네임 저장</button></form>
      </section>
      <DriverForm />
      <section className="section-card"><h2>비밀번호 변경</h2><form className="stack" onSubmit={e => save(e, { currentPassword: password.currentPassword, newPassword: password.newPassword }, '비밀번호가 변경되었습니다.')}>
        {[['currentPassword', '현재 비밀번호'], ['newPassword', '새 비밀번호'], ['confirm', '새 비밀번호 확인']].map(([key, label]) => <label key={key}>{label}<PasswordInput newPassword={key !== 'currentPassword'} value={password[key]} onChange={e => setPassword(v => ({ ...v, [key]: e.target.value }))} /></label>)}
        <button className="button secondary" disabled={busy}>비밀번호 변경</button></form></section>
      <section className="section-card"><h2>회원 탈퇴</h2><p className="muted">진행 중인 모집과 확정된 동행을 먼저 정리해 주세요. 탈퇴하면 이 계정으로 서비스를 이용할 수 없습니다.</p><button className="text-button" onClick={() => setConfirm(true)} disabled={busy}>탈퇴하기</button></section>
    </div>}
    {confirm && <Dialog title="회원 탈퇴" onClose={() => { if (!busy) setConfirm(false) }}><p>계정을 탈퇴하시겠어요? 탈퇴 후에는 이 계정으로 로그인할 수 없습니다.</p><div className="action-row"><button className="button secondary" disabled={busy} onClick={() => setConfirm(false)}>돌아가기</button><button className="button danger" disabled={busy} onClick={withdraw}>{busy ? '처리 중…' : '탈퇴 확인'}</button></div></Dialog>}
  </section>
}
