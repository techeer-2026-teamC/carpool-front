import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { authorizedFetch, getToken, refreshAccessToken } from '../../api/client'
import { startNotificationStream } from './connection.js'
import { createInbox } from './inbox.js'

const Context = createContext(null)
const empty = { items: [], unreadCount: 0, loading: false, loadingMore: false, hasNext: false, error: '' }

export function NotificationProvider({ memberId, children }) {
  const [inbox, setInbox] = useState(empty)
  const [status, setStatus] = useState('idle')
  const store = useRef(null)
  useEffect(() => {
    setInbox(empty)
    if (!memberId) { setStatus('idle'); return }
    let mounted = true
    const model = createInbox({
      request: async (path, options) => {
        const response = await authorizedFetch(path, options)
        return (await response.json()).data
      },
      onChange: value => { if (mounted) setInbox(value) },
    })
    store.current = model
    const stop = startNotificationStream({
      request: authorizedFetch, getToken, refreshToken: refreshAccessToken,
      onNotification: model.receive, onRepair: model.refresh,
      onStatus: value => { if (mounted) setStatus(value) },
      onLogout: () => { model.dispose(); if (mounted) setInbox(empty) },
    })
    return () => { mounted = false; stop(); model.dispose(); store.current = null }
  }, [memberId])
  return <Context.Provider value={{ ...inbox, status,
    refresh: () => store.current?.refresh(), loadMore: () => store.current?.loadMore(),
    markRead: id => store.current?.markRead(id),
  }}>{children}</Context.Provider>
}

export function useNotifications() {
  const value = useContext(Context)
  if (!value) throw new Error('NotificationProvider 안에서 사용해 주세요.')
  return value
}
