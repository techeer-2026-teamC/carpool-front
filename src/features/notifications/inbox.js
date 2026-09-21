export const validNotification = item => item && /^\d+$/.test(String(item.notificationId))
  && Number(item.notificationId) > 0 && typeof item.message === 'string'
export function mergeNotifications(previous, incoming) {
  const rows = new Map(previous.map(item => [String(item.notificationId), item]))
  for (const item of incoming.filter(validNotification)) {
    const old = rows.get(String(item.notificationId))
    rows.set(String(item.notificationId), { ...old, ...item, readAt: old?.readAt || item.readAt || null })
  }
  return [...rows.values()].sort((a, b) => Number(b.notificationId) - Number(a.notificationId))
}

export function createInbox({ request, onChange }) {
  let state = { items: [], unreadCount: 0, loading: false, loadingMore: false, hasNext: false, error: '' }
  let cursor = null, disposed = false, initialized = false, refreshPromise, morePromise, revision = 0, resync = false, tail = Promise.resolve()
  const abort = new AbortController()
  const reading = new Set()
  let confirmedIds = new Set()
  const emit = patch => { if (!disposed) { state = { ...state, ...patch }; onChange(state) } }
  const call = (path, options = {}) => request(path, { ...options, signal: abort.signal })
  const enqueue = work => {
    const result = tail.then(() => { if (!disposed) return work() })
    tail = result.catch(() => {})
    return result
  }
  async function sync() {
    emit({ loading: state.items.length === 0, error: '' })
    // Only DB-confirmed rows prove continuity; a live event may jump across a gap.
    const known = new Set(initialized ? confirmedIds : [])
    let page = await call('/notifications?size=20'), fresh = page.items
    let pages = 1
    // Bridge a missed burst before the previously loaded page; bound automatic catch-up.
    while (known.size && page.hasNext && !page.items.some(item => known.has(String(item.notificationId))) && pages < 10) {
      page = await call(`/notifications?size=20&beforeId=${page.nextCursor}`)
      fresh = fresh.concat(page.items); pages++
    }
    const overlapping = fresh.some(item => known.has(String(item.notificationId)))
    const keepHistory = known.size && overlapping
    const countRevision = revision
    const count = await call('/notifications/unread-count')
    resync = revision !== countRevision
    if (!keepHistory) cursor = page.nextCursor
    confirmedIds = new Set([...(keepHistory ? confirmedIds : []), ...fresh.map(item => String(item.notificationId))])
    const newer = state.items.filter(item => Number(item.notificationId) > Number(fresh[0]?.notificationId || 0))
    emit({ items: mergeNotifications(keepHistory ? state.items : newer, fresh),
      hasNext: keepHistory ? state.hasNext : page.hasNext,
      ...(!resync ? { unreadCount: count.count } : {}) })
    initialized = true
  }
  function refresh() {
    if (disposed) return Promise.resolve()
    if (!refreshPromise) refreshPromise = enqueue(sync)
      .catch(error => { if (error.name !== 'AbortError') emit({ error: error.message }) })
      .finally(() => { refreshPromise = null; emit({ loading: false }); if (resync && !disposed) { resync = false; void refresh() } })
    return refreshPromise
  }
  function receive(item) {
    if (disposed || !validNotification(item)) return
    const exists = state.items.some(old => String(old.notificationId) === String(item.notificationId))
    if (!exists) revision++
    emit({ items: mergeNotifications(state.items, [item]),
      unreadCount: state.unreadCount + (!exists && !item.readAt ? 1 : 0) })
  }
  function loadMore() {
    if (disposed || !state.hasNext || morePromise) return morePromise || Promise.resolve()
    emit({ loadingMore: true, error: '' })
    morePromise = enqueue(async () => {
      if (!state.hasNext || cursor == null) return
      const page = await call(`/notifications?size=20&beforeId=${cursor}`)
      cursor = page.nextCursor
      for (const item of page.items) confirmedIds.add(String(item.notificationId))
      emit({ items: mergeNotifications(state.items, page.items), hasNext: page.hasNext })
    }).catch(error => { if (error.name !== 'AbortError') emit({ error: error.message }) })
      .finally(() => { morePromise = null; emit({ loadingMore: false }) })
    return morePromise
  }
  async function markRead(id) {
    if (disposed || reading.has(String(id))) return
    const item = state.items.find(row => String(row.notificationId) === String(id))
    if (!item || item.readAt) return
    reading.add(String(id))
    try {
      await call(`/notifications/${id}/read`, { method: 'PATCH' })
      revision++
      emit({ items: mergeNotifications(state.items, [{ ...item, readAt: new Date().toISOString() }]),
        unreadCount: Math.max(0, state.unreadCount - 1), error: '' })
      await refresh()
    } catch (error) { if (error.name !== 'AbortError') emit({ error: error.message }); throw error }
    finally { reading.delete(String(id)) }
  }
  return { refresh, receive, loadMore, markRead, snapshot: () => state,
    dispose() { disposed = true; abort.abort(); reading.clear() } }
}
