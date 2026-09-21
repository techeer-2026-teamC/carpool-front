import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../api/client'

export function useTripResource(path, revision = 0) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(Boolean(path))
  const [error, setError] = useState('')
  const generation = useRef(0)
  const request = useRef(null)
  const active = useRef(true)
  const reload = useCallback(async () => {
    const current = ++generation.current
    request.current?.abort()
    if (!path) { setData(null); setLoading(false); setError(''); return }
    request.current = new AbortController()
    setLoading(true); setError('')
    try {
      const response = await api.get(path, { signal: request.current.signal })
      if (active.current && current === generation.current) setData(response.data)
      return response.data
    } catch (failure) {
      if (failure.name !== 'AbortError' && active.current && current === generation.current) { setData(null); setError(failure.message) }
    } finally {
      if (active.current && current === generation.current) setLoading(false)
    }
  }, [path])
  useEffect(() => { setData(null) }, [path])
  useEffect(() => {
    active.current = true
    reload()
    return () => { active.current = false; generation.current++; request.current?.abort() }
  }, [reload, revision])
  return { data, loading, error, reload }
}

export function useTripAction(onChanged) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const pending = useRef(false)
  const active = useRef(true)
  useEffect(() => { active.current = true; return () => { active.current = false } }, [])
  async function run(action, success) {
    if (pending.current) return false
    pending.current = true; setBusy(true); setError(''); setNotice('')
    try {
      await action()
      await onChanged?.()
      if (active.current) setNotice(success)
      return true
    } catch (failure) {
      if (active.current) setError(failure.status === 409
        ? `${failure.message} 최신 상태를 다시 불러왔어요.` : failure.message)
      if ([403, 404, 409].includes(failure.status)) await onChanged?.()
      return false
    } finally {
      pending.current = false
      if (active.current) setBusy(false)
    }
  }
  return { busy, error, notice, run }
}
