import React from 'react'
import { localDate } from './format'

export default function DateField({ value, onChange, required = false }) {
  function choose(offset) {
    const date = new Date()
    date.setDate(date.getDate() + offset)
    onChange(localDate(date))
  }
  return <div className="date-field">
    <label>출발 날짜<input type="date" required={required} min={localDate()} value={value} onChange={event => onChange(event.target.value)} /></label>
    <div className="action-row" aria-label="빠른 날짜 선택"><button type="button" className="text-button" onClick={() => choose(0)}>오늘</button><button type="button" className="text-button" onClick={() => choose(1)}>내일</button></div>
  </div>
}
