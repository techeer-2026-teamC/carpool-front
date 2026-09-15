import React, { useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
function Pick({ onPick }) { useMapEvents({ click: event => onPick({ lat: event.latlng.lat, lng: event.latlng.lng }) }); return null }
export default function PlaceMap({ initial, onSelect, readOnly = false, markers = [] }) {
  const [point, setPoint] = useState(initial || null)
  const [name, setName] = useState(initial?.name || '')
  const center = initial || markers[0] || { lat: 37.4979, lng: 127.0276 }
  return <div className="stack">{!readOnly && <p className="muted">지도에서 만날 지점을 누르고, 알아보기 쉬운 장소 이름을 적어 주세요.</p>}
    <MapContainer center={[center.lat, center.lng]} zoom={14} style={{ height: 300, width: '100%' }}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {!readOnly && <Pick onPick={setPoint} />}{!readOnly && point && <CircleMarker center={[point.lat, point.lng]} radius={10} color="#14624e" />}
      {readOnly && markers.map((marker, index) => <CircleMarker key={`${marker.name}-${index}`} center={[marker.lat, marker.lng]} radius={9} color={index ? '#a56718' : '#14624e'} />)}
    </MapContainer>
    {readOnly ? <div className="muted small">{markers.map(m => m.name).join(' · ')}</div> : <><label>장소 이름<input maxLength={100} value={name} onChange={e => setName(e.target.value)} placeholder="예: 회사 정문 앞" /></label>
    <button type="button" className="button primary" disabled={!point || !name.trim()} onClick={() => onSelect({ ...point, name: name.trim() })}>이 장소로 선택</button></>}
  </div>
}
