import React, { useEffect, useRef, useState } from 'react'
import { api, captureAuthorization } from '../../api/client'
import Dialog from '../shared/Dialog'
import { ErrorNotice } from '../shared/Feedback'

export default function AuthDialog({ onClose, onLogin }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', nickname: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(null)
  useEffect(() => {
    const changed = () => { if (pending.current && !pending.current.isCurrent()) pending.current.abort.abort() }
    for (const event of ['auth:token', 'auth:logout', 'storage']) window.addEventListener(event, changed)
    return () => {
      pending.current?.abort.abort()
      for (const event of ['auth:token', 'auth:logout', 'storage']) window.removeEventListener(event, changed)
    }
  }, [])
  const change = event => setForm(value => ({ ...value, [event.target.name]: event.target.value }))
  async function submit(event) {
    event.preventDefault()
    if (busy) return
    const abort = new AbortController(), currentSession = captureAuthorization()
    const isCurrent = () => !abort.signal.aborted && currentSession()
    pending.current = { abort, isCurrent }
    setBusy(true); setError('')
    try {
      if (mode === 'signup') {
        await api.post('/auth/signup', { email: form.email.trim(), password: form.password, nickname: form.nickname.trim() }, { signal: abort.signal })
        if (!isCurrent()) return
        setMode('login')
      }
      const { data } = await api.post('/auth/login', { email: form.email.trim(), password: form.password }, { signal: abort.signal })
      if (isCurrent()) onLogin(data.accessToken)
    } catch (e) { if (isCurrent()) setError(e.message) }
    finally { if (isCurrent()) setBusy(false) }
  }
  return <Dialog title={mode === 'login' ? '다시 만나 반가워요' : '모아와 함께 시작해요'} onClose={() => { if (!busy) onClose() }}>
    <p className="muted">같은 방향으로 가는 사람들과 일상의 이동을 함께해요.</p>
    <div className="transport-tabs" role="group" aria-label="로그인 또는 회원가입">
      <button type="button" className={mode === 'login' ? 'active' : ''} disabled={busy} onClick={() => { setMode('login'); setError('') }}>로그인</button>
      <button type="button" className={mode === 'signup' ? 'active' : ''} disabled={busy} onClick={() => { setMode('signup'); setError('') }}>회원가입</button>
    </div>
    <form className="stack" onSubmit={submit}>
      <label>이메일<input type="email" name="email" autoComplete="email" required value={form.email} onChange={change} /></label>
      {mode === 'signup' && <label>닉네임<input name="nickname" autoComplete="nickname" required maxLength={30} value={form.nickname} onChange={change} /></label>}
      <label>비밀번호<input type="password" name="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required minLength={8} maxLength={64} value={form.password} onChange={change} /></label>
      <ErrorNotice error={error} />
      <button className="button primary" disabled={busy}>{busy ? '처리 중…' : mode === 'login' ? '로그인하고 함께 가기' : '회원가입하고 시작하기'}</button>
    </form>
  </Dialog>
}
