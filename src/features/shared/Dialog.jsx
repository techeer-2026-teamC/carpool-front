import React, { useEffect, useRef } from 'react'

export default function Dialog({ title, onClose, children, wide = false }) {
  const dialog = useRef(null)
  useEffect(() => {
    const element = dialog.current
    const previous = document.activeElement
    element.showModal()
    return () => { element.close(); previous?.focus() }
  }, [])
  return <dialog ref={dialog} className={`moa-dialog ${wide ? 'wide' : ''}`}
    onCancel={event => { event.preventDefault(); onClose() }}
    onClick={event => { if (event.target === event.currentTarget) onClose() }} aria-label={title}>
    <div className="dialog-head"><h2>{title}</h2><button type="button" className="icon-button" onClick={onClose} aria-label="닫기">×</button></div>
    <div className="dialog-content">{children}</div>
  </dialog>
}
