import React, { useEffect, useRef } from 'react'
import { TAG_MAP } from '../data/tags'
import { fmtDate, fmtPrice } from './CarpoolCard'

const SW = { lat: 36.8, lng: 126.4 }
const NE = { lat: 38.1, lng: 128.0 }

export default function MapView({ posts, onOpenDetail }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const overlaysRef = useRef([])

  useEffect(() => {
    window.__openDetail = onOpenDetail
    return () => { delete window.__openDetail }
  }, [onOpenDetail])

  useEffect(() => {
    if (!mapRef.current) return

    window.kakao.maps.load(() => {
      const kakao = window.kakao

      if (!mapInstanceRef.current) {
        mapInstanceRef.current = new kakao.maps.Map(mapRef.current, {
          center: new kakao.maps.LatLng(37.5326, 127.0246),
          level: 8,
        })

        kakao.maps.event.addListener(mapInstanceRef.current, 'center_changed', () => {
          const map = mapInstanceRef.current
          const c = map.getCenter()
          const lat = Math.max(SW.lat, Math.min(NE.lat, c.getLat()))
          const lng = Math.max(SW.lng, Math.min(NE.lng, c.getLng()))
          if (lat !== c.getLat() || lng !== c.getLng()) {
            map.setCenter(new kakao.maps.LatLng(lat, lng))
          }
        })
      }

      const map = mapInstanceRef.current
      overlaysRef.current.forEach(o => o.setMap(null))
      overlaysRef.current = []

      posts.forEach(p => {
        if (p.departureLat == null || p.departureLng == null) return

        const avail = p.seats - p.filled
        const full = avail <= 0
        const col = full ? '#c0392b' : (p.color || '#6b7c3f')

        const el = document.createElement('div')
        el.innerHTML = `
          <div style="
            width:42px;height:42px;
            border-radius:50% 50% 50% 5px;
            transform:rotate(-45deg);
            background:${col};
            border:2.5px solid white;
            box-shadow:0 3px 14px rgba(0,0,0,0.25);
            display:flex;align-items:center;justify-content:center;
            cursor:pointer;
          ">
            <span style="
              transform:rotate(45deg);
              font-size:0.55rem;font-weight:900;
              color:white;font-family:'Space Mono',monospace;
              text-align:center;line-height:1.1;
            ">${full ? '✕' : avail + '석'}</span>
          </div>
        `
        el.addEventListener('click', () => onOpenDetail(String(p.id)))

        const overlay = new kakao.maps.CustomOverlay({
          position: new kakao.maps.LatLng(p.departureLat, p.departureLng),
          content: el,
          yAnchor: 1,
          zIndex: 3,
        })
        overlay.setMap(map)
        overlaysRef.current.push(overlay)
      })

      const toSeen = new Set()
      posts.forEach(p => {
        if (p.destinationLat == null || p.destinationLng == null) return
        if (toSeen.has(p.to)) return
        toSeen.add(p.to)

        const dot = document.createElement('div')
        dot.innerHTML = `
          <div style="
            width:13px;height:13px;
            border-radius:50%;
            background:#fff;
            border:2.5px solid #6b7c3f;
            box-shadow:0 1px 6px rgba(0,0,0,0.18);
          "></div>
        `

        const overlay = new kakao.maps.CustomOverlay({
          position: new kakao.maps.LatLng(p.destinationLat, p.destinationLng),
          content: dot,
          zIndex: 1,
        })
        overlay.setMap(map)
        overlaysRef.current.push(overlay)
      })
    })
  }, [posts, onOpenDetail])

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
                <div key={p.id} style={styles.mapCard} onClick={() => onOpenDetail(p.id)}>
                  <div style={styles.mapRoute}>
                    {p.from}
                    <span style={{ color: 'var(--accent)', margin: '0 3px' }}>→</span>
                    {p.to}
                    <span style={{
                      ...styles.badge,
                      ...(avail <= 0 ? styles.badgeFull : styles.badgeSeats),
                      marginLeft: 'auto',
                    }}>
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
          <div style={{ width:14, height:14, borderRadius:'50% 50% 50% 3px', transform:'rotate(-45deg)', background:'var(--accent)', border:'2px solid white', boxShadow:'0 1px 4px rgba(0,0,0,0.2)' }} />
          출발지
        </div>
        <div style={styles.legendItem}>
          <div style={{ width:12, height:12, borderRadius:'50%', background:'#fff', border:'2.5px solid var(--accent)' }} />
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
