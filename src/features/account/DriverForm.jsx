import React, { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { ErrorNotice, Loading } from '../shared/Feedback'

export default function DriverForm() {
  const [driver, setDriver] = useState(null)
  const [form, setForm] = useState({ carModel: '', carColor: '', carNumber: '' })
  const [colors, setColors] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const abort = new AbortController()
    setLoading(true); setError('')
    Promise.all([
      api.get('/drivers/me', { signal: abort.signal }).catch(e => { if (e.status === 404) return { data: null }; throw e }),
      api.get('/drivers/colors', { signal: abort.signal }),
    ]).then(([current, palette]) => {
      if (abort.signal.aborted) return
      setDriver(current.data)
      if (current.data) setForm(current.data)
      setColors(palette.data)
    }).catch(e => { if (!abort.signal.aborted) setError(e.message) })
      .finally(() => { if (!abort.signal.aborted) setLoading(false) })
    return () => abort.abort()
  }, [retry])
  async function submit(event) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError(''); setMessage('')
    const payload = { carModel: form.carModel.trim(), carColor: form.carColor, carNumber: form.carNumber.trim() }
    try {
      const { data } = driver ? await api.put('/drivers', payload) : await api.post('/drivers', payload)
      setDriver(data); setMessage('차량 정보가 저장되었습니다.')
    } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }
  return <section className="section-card"><h2>카풀 운전자 정보</h2><p className="muted">카풀을 모집하려면 차량 정보를 등록해 주세요. 택시 동승 모집에는 필요하지 않아요.</p>
    <ErrorNotice error={error} retry={() => setRetry(value => value + 1)} />
    {loading ? <Loading /> : <form className="stack" onSubmit={submit}>
      <label>차량 모델<input required maxLength={100} value={form.carModel} placeholder="예: 아반떼" onChange={e => setForm(v => ({ ...v, carModel: e.target.value }))} /></label>
      <div className="form-row"><label>차량 색상<select required value={form.carColor} onChange={e => setForm(v => ({ ...v, carColor: e.target.value }))}><option value="">색상 선택</option>{colors.map(color => <option key={color.name} value={color.name}>{color.label}</option>)}</select></label>
        <label>차량 번호<input required maxLength={20} value={form.carNumber} placeholder="예: 12가3456" onChange={e => setForm(v => ({ ...v, carNumber: e.target.value }))} /></label></div>
      {message && <p role="status" className="notice">{message}</p>}<button className="button secondary" disabled={busy || !colors.length}>{busy ? '저장 중…' : driver ? '차량 정보 수정' : '운전자 등록'}</button>
    </form>}
  </section>
}
