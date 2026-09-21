import React from 'react'
export function ErrorNotice({ error, retry }) {
  return error ? <div className="notice error" role="alert"><span>{error}</span>{retry && <button onClick={retry}>다시 시도</button>}</div> : null
}
export function EmptyState({ title, children }) {
  return <div className="empty"><span aria-hidden="true">↗</span><h3>{title}</h3><div>{children}</div></div>
}
export function Loading() { return <div className="loading" role="status">잠시만요, 불러오고 있어요…</div> }
