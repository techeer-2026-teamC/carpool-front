import React, { lazy, Suspense, useState } from 'react'
import Dialog from './Dialog'
const PlaceMap = lazy(() => import('./PlaceMap'))
export const PLACES = [
  { name: '강남역', lat: 37.4979, lng: 127.0276 },
  { name: '판교역', lat: 37.3943, lng: 127.1110 },
  { name: '서울역', lat: 37.5547, lng: 126.9706 },
  { name: '홍대입구역', lat: 37.5572, lng: 126.9245 },
  { name: '잠실역', lat: 37.5133, lng: 127.1001 },
  { name: '성수역', lat: 37.5445, lng: 127.0557 },
]
export default function PlacePicker({ label, value, onChange, optional = false }) {
  const [map, setMap] = useState(false)
  return <div className="place-field"><span className="field-label">{label}</span>
    <div className="place-control"><select aria-label={label} value={value?.name || ''} onChange={e => onChange(PLACES.find(p => p.name === e.target.value) || null)}>
      <option value="">{optional ? '전체 지역' : '장소 선택'}</option>
      {PLACES.map(p => <option key={p.name}>{p.name}</option>)}
      {value && !PLACES.some(p => p.name === value.name) && <option>{value.name}</option>}
    </select><button type="button" className="map-pick" onClick={() => setMap(true)}>지도 선택</button></div>
    {map && <Dialog title={`${label}를 지도에서 선택`} onClose={() => setMap(false)}><Suspense fallback={<p>지도를 불러옵니다…</p>}>
      <PlaceMap initial={value} onSelect={place => { onChange(place); setMap(false) }} />
    </Suspense></Dialog>}
  </div>
}
