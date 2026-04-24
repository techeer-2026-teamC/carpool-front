import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import { TAG_MAP } from '../data/tags'
import { LOCATION_COORDS } from '../data/mockData'
import { fmtDate, fmtPrice } from './CarpoolCard'

export default function MapView({ posts, onOpenDetail }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])

  useEffect(() => {
    if (!mapRef.current) return
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, { zoomControl: true }).setView([37.5326, 127.0246], 11)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(mapInstanceRef.current)
    }

    const map = mapInstanceRef.current
    markersRef.current.forEach(m => map.removeLayer(m))
    markersRef.current = []

    // 출발지 마커
    const byFrom = {}
    posts.forEach(p => {
      if (!byFrom[p.from]) byFrom[p.from] = []
      byFrom[p.from].push(p)
    })

    Object.entries(byFrom).forEach(([loc, ps]) => {
      ps.forEach((p, idx) => {
        const baseCoords = (p.departureLat != null && p.departureLng != null)
          ? [p.departureLat, p.departureLng]
          : LOCATION_COORDS[loc]
        if (!baseCoords) return
        const offset = idx * 0.0025
        const latlng = [baseCoords[0] + offset, baseCoords[1] + offset]
        const avail = p.seats - p.filled
        const full = avail <= 0
        const col = full ? '#c0392b' : p.color

        const icon = L.divIcon({
          className: '',
          html: `<div style="width:40px;height:40px;border-radius:50% 50% 50% 5px;transform:rotate(-45deg);background:${col};border:2.5px solid white;box-shadow:0 3px 14px rgba(0,0,0,0.22);display:flex;align-items:center;justify-content:center;">
            <span style="transform:rotate(45deg);font-size:0.55rem;font-weight:900;color:white;font-family:'Space Mono',monospace;text-align:center;line-height:1.1">${full ? '✕' : avail + '석'}</span>
          </div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 40],
          popupAnchor: [0, -44],
        })

        const tagsHtml = (p.tags?.length)
          ? `<div style="display:flex;flex-wrap:wrap;gap:0.25rem;margin-bottom:0.7rem">
              ${p.tags.map(tid => {
                const t = TAG_MAP[tid]
                return t ? `<span style="display:inline-flex;align-items:center;gap:0.2rem;font-size:0.66rem;font-weight:600;padding:0.15rem 0.45rem;border-radius:100px;background:${t.bg};color:${t.tc}">${t.emoji} ${t.label}</span>` : ''
              }).join('')}
            </div>` : ''

        const marker = L.marker(latlng, { icon }).addTo(map)
        marker.bindPopup(`
          <div style="padding:1rem 1.15rem;min-width:220px;font-family:'Noto Sans KR',sans-serif">
            <div style="display:flex;align-items:center;gap:0.35rem;font-weight:700;font-size:0.93rem;color:var(--text);margin-bottom:0.5rem">
              ${p.from}<span style="color:var(--accent);margin:0 4px">→</span>${p.to}
            </div>
            <div style="display:flex;gap:0.7rem;font-size:0.76rem;color:var(--text-muted);margin-bottom:0.6rem;flex-wrap:wrap">
              <span>📅 ${fmtDate(p.date)}</span><span>⏰ ${p.time}</span><span>👥 ${p.filled}/${p.seats}명</span>
            </div>
            ${tagsHtml}
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div style="font-family:'Space Mono',monospace;font-size:0.9rem;font-weight:700;color:var(--accent)">${fmtPrice(p.price)}<span style="font-size:0.65rem;color:var(--text-muted);font-family:'Noto Sans KR',sans-serif">/인</span></div>
              <button onclick="window.__openDetail('${p.id}')" style="background:var(--accent);color:#fff;border:none;cursor:pointer;font-size:0.74rem;font-weight:700;font-family:'Noto Sans KR',sans-serif;padding:0.35rem 0.85rem;border-radius:7px">상세보기</button>
            </div>
          </div>
        `, { maxWidth: 300, minWidth: 240 })

        markersRef.current.push(marker)
      })
    })

    // 목적지 마커
    const toSeen = new Set()
    posts.forEach(p => {
      if (toSeen.has(p.to)) return
      toSeen.add(p.to)
      const c = (p.destinationLat != null && p.destinationLng != null)
        ? [p.destinationLat, p.destinationLng]
        : LOCATION_COORDS[p.to]
      if (!c) return
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:13px;height:13px;border-radius:50%;background:#fff;border:2.5px solid #6b7c3f;box-shadow:0 1px 6px rgba(0,0,0,0.18)"></div>`,
        iconSize: [13, 13],
        iconAnchor: [6, 6],
      })
      const m = L.marker(c, { icon, zIndexOffset: -100 }).addTo(map)
      m.bindTooltip(p.to, { permanent: false, direction: 'top' })
      markersRef.current.push(m)
    })

    if (markersRef.current.length > 0) {
      try {
        map.fitBounds(L.featureGroup(markersRef.current).getBounds().pad(0.18))
      } catch {}
    }
    setTimeout(() => map.invalidateSize(), 60)
  }, [posts])

  // 팝업 버튼 클릭 핸들러 등록
  useEffect(() => {
    window.__openDetail = onOpenDetail
    return () => { delete window.__openDetail }
  }, [onOpenDetail])

  return (
    <div style={styles.container}>
      <div ref={mapRef} style={styles.map} />
      <div style={styles.sidebar}>
        <div style={styles.sidebarInner}>
          <div style={styles.sidebarHeader}>총 {posts.length}개 카풀</div>
          <div>
            {posts.map(p => {
              const avail = p.seats - p.filled
              return (
                <div
                  key={p.id}
                  style={styles.mapCard}
                  onClick={() => onOpenDetail(p.id)}
                >
                  <div style={styles.mapRoute}>
                    {p.from}
                    <span style={{ color: 'var(--accent)', margin: '0 3px' }}>→</span>
                    {p.to}
                    <span style={{ ...styles.badge, ...(avail <= 0 ? styles.badgeFull : styles.badgeSeats), marginLeft: 'auto' }}>
                      {avail <= 0 ? '마감' : `${avail}석`}
                    </span>
                  </div>
                  <div style={styles.mapMeta}>
                    <span>📅 {fmtDate(p.date)}</span>
                    <span>⏰ {p.time}</span>
                    <span style={styles.mapPrice}>{fmtPrice(p.price)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <div style={{ width: 14, height: 14, borderRadius: '50% 50% 50% 3px', transform: 'rotate(-45deg)', background: 'var(--accent)', border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
          출발지
        </div>
        <div style={styles.legendItem}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#fff', border: '2.5px solid var(--accent)' }} />
          목적지
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
    border: '1px solid var(--border)',
    boxShadow: '0 4px 24px rgba(107,124,63,0.1)',
    marginBottom: '3rem',
  },
  map: {
    height: 660,
    width: '100%',
  },
  sidebar: {
    position: 'absolute',
    top: 12,
    right: 12,
    bottom: 12,
    width: 300,
    zIndex: 400,
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarInner: {
    background: 'rgba(255,255,255,0.96)',
    backdropFilter: 'blur(12px)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    overflowY: 'auto',
    flex: 1,
    boxShadow: '0 4px 24px rgba(107,124,63,0.15)',
  },
  sidebarHeader: {
    padding: '0.9rem 1.1rem 0.7rem',
    borderBottom: '1px solid var(--border)',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    position: 'sticky',
    top: 0,
    background: 'rgba(255,255,255,0.96)',
    zIndex: 1,
    borderRadius: '16px 16px 0 0',
  },
  mapCard: {
    padding: '0.85rem 1.1rem',
    borderBottom: '1px solid var(--border)',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  mapRoute: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    fontWeight: 700,
    fontSize: '0.85rem',
    color: 'var(--text)',
    marginBottom: '0.35rem',
  },
  mapMeta: {
    display: 'flex',
    gap: '0.6rem',
    fontSize: '0.73rem',
    color: 'var(--text-muted)',
    alignItems: 'center',
  },
  mapPrice: {
    fontFamily: "'Space Mono', monospace",
    fontSize: '0.78rem',
    fontWeight: 700,
    color: 'var(--accent)',
    marginLeft: 'auto',
  },
  badge: {
    fontSize: '0.68rem',
    fontWeight: 700,
    padding: '0.22rem 0.55rem',
    borderRadius: 6,
    fontFamily: "'Space Mono', monospace",
  },
  badgeSeats: {
    background: 'var(--accent-pale)',
    color: 'var(--accent)',
  },
  badgeFull: {
    background: 'rgba(192,57,43,0.1)',
    color: 'var(--accent3)',
  },
  legend: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    zIndex: 400,
    background: 'rgba(255,255,255,0.93)',
    backdropFilter: 'blur(8px)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '0.6rem 0.9rem',
    fontSize: '0.73rem',
    color: 'var(--text-muted)',
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
}
