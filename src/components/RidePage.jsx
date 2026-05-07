import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Client } from '@stomp/stompjs'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  getMyRidesAsDriver, getMyRidesAsPassenger, startRide, completeRide,
  getPassengers, boardPassenger, dropOffPassenger,
} from '../api/rides'
import { getMyReviewForRide } from '../api/reviews'
import ReviewModal from './ReviewModal'

// Leaflet 기본 마커 아이콘 경로 수정
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const driverIcon = L.divIcon({
  html: '<div style="width:32px;height:32px;background:#27ae60;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:14px;">🚗</div>',
  className: '', iconSize: [32, 32], iconAnchor: [16, 16],
})
const depIcon = L.divIcon({
  html: '<div style="width:28px;height:28px;background:#6b7c3f;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:12px;">🚦</div>',
  className: '', iconSize: [28, 28], iconAnchor: [14, 14],
})
const destIcon = L.divIcon({
  html: '<div style="width:28px;height:28px;background:#c0392b;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:12px;">🏁</div>',
  className: '', iconSize: [28, 28], iconAnchor: [14, 14],
})

function FlyToDriver({ pos }) {
  const map = useMap()
  useEffect(() => {
    if (pos) map.flyTo(pos, map.getZoom(), { animate: true, duration: 1.2 })
  }, [pos, map])
  return null
}

function RideMap({ ride, driverPos, follow }) {
  const defaultCenter = driverPos
    || (ride.departureLat && ride.departureLng ? [ride.departureLat, ride.departureLng] : [37.5665, 126.9780])

  return (
    <div style={{ height: 260, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
      <MapContainer center={defaultCenter} zoom={14} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        {driverPos && (
          <Marker position={driverPos} icon={driverIcon}>
            <Popup>드라이버 현재 위치</Popup>
          </Marker>
        )}
        {ride.departureLat && ride.departureLng && (
          <Marker position={[ride.departureLat, ride.departureLng]} icon={depIcon}>
            <Popup>{ride.departureLocation || '출발지'}</Popup>
          </Marker>
        )}
        {ride.destinationLat && ride.destinationLng && (
          <Marker position={[ride.destinationLat, ride.destinationLng]} icon={destIcon}>
            <Popup>{ride.destinationLocation || '목적지'}</Popup>
          </Marker>
        )}
        {follow && driverPos && <FlyToDriver pos={driverPos} />}
      </MapContainer>
    </div>
  )
}

function useCountdown(targetDate) {
  const [remaining, setRemaining] = useState(null)
  useEffect(() => {
    if (!targetDate) return
    const calc = () => {
      const diff = new Date(targetDate) - Date.now()
      setRemaining(diff)
    }
    calc()
    const t = setInterval(calc, 10000)
    return () => clearInterval(t)
  }, [targetDate])
  return remaining
}

function PreDepartureInfo({ ride, remainingMs }) {
  if (remainingMs === null) return null
  const mins = Math.floor(remainingMs / 60000)
  if (remainingMs <= 0) return null
  return (
    <div style={styles.countdownBox}>
      <span style={{ fontSize: '1.1rem' }}>⏱</span>
      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }}>
        출발까지 {mins > 60 ? `${Math.floor(mins / 60)}시간 ${mins % 60}분` : `${mins}분`}
      </span>
      {remainingMs <= 30 * 60 * 1000 && (
        <span style={{ fontSize: '0.72rem', color: '#27ae60', fontWeight: 700 }}>● 위치 공유 중</span>
      )}
    </div>
  )
}

const PASSENGER_STATUS_MAP = {
  PENDING:    { label: '탑승 대기', color: 'var(--text-muted)' },
  BOARDED:    { label: '탑승 중',   color: '#27ae60' },
  DROPPED_OFF:{ label: '하차 완료', color: 'var(--accent)' },
}

function PassengerRow({ passenger, onBoard, onDropOff }) {
  const { label, color } = PASSENGER_STATUS_MAP[passenger.status] || { label: passenger.status, color: 'var(--text-muted)' }
  return (
    <div style={styles.passengerRow}>
      <div style={{ flex: 1 }}>
        <div style={styles.passengerId}>승객 #{passenger.passengerId}</div>
        <span style={{ fontSize: '0.75rem', color, fontWeight: 700 }}>{label}</span>
      </div>
      <div style={{ display: 'flex', gap: '0.4rem' }}>
        {passenger.status === 'PENDING' && (
          <button style={styles.smallBtn} onClick={() => onBoard(passenger.applicationId)}>탑승 확인</button>
        )}
        {passenger.status === 'BOARDED' && (
          <button style={{ ...styles.smallBtn, ...styles.smallBtnDanger }} onClick={() => onDropOff(passenger.applicationId)}>하차 확인</button>
        )}
      </div>
    </div>
  )
}

function ActiveRidePanel({ ride, isDriver }) {
  const [passengers, setPassengers] = useState([])
  const [driverPos, setDriverPos] = useState(
    ride.currentLatitude && ride.currentLongitude ? [ride.currentLatitude, ride.currentLongitude] : null
  )
  const [connected, setConnected] = useState(false)
  const [err, setErr] = useState('')
  const stompRef = useRef(null)
  const geoIntervalRef = useRef(null)
  const remainingMs = useCountdown(ride.departureTime)
  const withinWindow = remainingMs !== null && remainingMs <= 30 * 60 * 1000

  useEffect(() => {
    if (isDriver) {
      getPassengers(ride.id)
        .then(data => setPassengers(data || []))
        .catch(() => setErr('탑승자 목록을 불러오지 못했습니다.'))
    }
  }, [ride.id, isDriver])

  useEffect(() => {
    const isActive = ride.status === 'IN_PROGRESS'
    const shouldConnect = isActive || (ride.status === 'SCHEDULED' && withinWindow)
    if (!shouldConnect) return

    const token = localStorage.getItem('accessToken')
    const client = new Client({
      brokerURL: 'ws://localhost:5173/ws',
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        setConnected(true)
        if (isDriver) {
          const sendLocation = () => {
            if (!navigator.geolocation || !client.connected) return
            navigator.geolocation.getCurrentPosition(pos => {
              const { latitude, longitude } = pos.coords
              setDriverPos([latitude, longitude])
              client.publish({
                destination: `/app/ride/${ride.id}/location`,
                body: JSON.stringify({ latitude, longitude }),
              })
            })
          }
          sendLocation()
          geoIntervalRef.current = setInterval(sendLocation, 5000)
        } else {
          client.subscribe(`/topic/ride/${ride.id}`, msg => {
            const loc = JSON.parse(msg.body)
            setDriverPos([loc.latitude, loc.longitude])
          })
        }
      },
      onDisconnect: () => { setConnected(false) },
      onStompError: () => setErr('위치 연결에 실패했습니다.'),
    })
    client.activate()
    stompRef.current = client

    return () => {
      clearInterval(geoIntervalRef.current)
      client.deactivate()
    }
  }, [ride.id, ride.status, isDriver, withinWindow])

  async function handleBoard(applicationId) {
    try {
      const updated = await boardPassenger(ride.id, applicationId)
      setPassengers(prev => prev.map(p => p.applicationId === applicationId ? updated : p))
    } catch (e) {
      setErr(e.message || '탑승 확인에 실패했습니다.')
    }
  }

  async function handleDropOff(applicationId) {
    try {
      const updated = await dropOffPassenger(ride.id, applicationId)
      setPassengers(prev => prev.map(p => p.applicationId === applicationId ? updated : p))
    } catch (e) {
      setErr(e.message || '하차 확인에 실패했습니다.')
    }
  }

  return (
    <section style={{ ...styles.card, border: '2px solid #27ae60' }}>
      <div style={styles.cardHeader}>
        <div style={{ ...styles.dot, background: '#27ae60' }} />
        <h2 style={styles.cardTitle}>
          {ride.status === 'SCHEDULED' ? '운행 예정' : '운행 중'} — {isDriver ? '드라이버' : '승객'}
        </h2>
        <span style={{ ...styles.activeBadge, marginLeft: 'auto' }}>#{ride.id}</span>
        {isDriver && connected && (
          <span style={{ fontSize: '0.72rem', color: '#27ae60', fontWeight: 700 }}>● 위치 전송 중</span>
        )}
      </div>

      {ride.departureLocation && (
        <div style={styles.routeBox}>
          <span style={styles.routeFrom}>{ride.departureLocation}</span>
          <span style={{ color: 'var(--accent)', fontWeight: 700 }}>→</span>
          <span style={styles.routeTo}>{ride.destinationLocation}</span>
        </div>
      )}

      {ride.status === 'SCHEDULED' && <PreDepartureInfo ride={ride} remainingMs={remainingMs} />}

      {err && <div style={styles.errorBox}>{err}</div>}

      <RideMap ride={ride} driverPos={driverPos} follow={!isDriver} />

      {isDriver && (
        <div style={{ marginTop: '1rem' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            탑승자 관리
          </div>
          {passengers.length === 0 ? (
            <p style={styles.emptyText}>탑승자가 없습니다</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {passengers.map(p => (
                <PassengerRow key={p.id} passenger={p} onBoard={handleBoard} onDropOff={handleDropOff} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function ReviewSection({ ride }) {
  const [reviewStatus, setReviewStatus] = useState('loading')
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    getMyReviewForRide(ride.id)
      .then(data => setReviewStatus(data ? 'done' : 'pending'))
      .catch(() => setReviewStatus('pending'))
  }, [ride.id])

  if (reviewStatus === 'loading') return null

  return (
    <div style={styles.reviewSection}>
      {reviewStatus === 'done' ? (
        <div style={styles.reviewDone}>평가 완료</div>
      ) : (
        <button style={styles.reviewBtn} onClick={() => setShowModal(true)}>
          ★ 드라이버 평가하기
        </button>
      )}
      {showModal && (
        <ReviewModal
          ride={ride}
          onClose={() => setShowModal(false)}
          onSubmitted={() => setReviewStatus('done')}
        />
      )}
    </div>
  )
}

function RideStatusBadge({ status }) {
  const map = {
    SCHEDULED:   { label: '예정', bg: 'var(--accent-pale)', color: 'var(--accent)' },
    IN_PROGRESS: { label: '운행 중', bg: 'rgba(39,174,96,0.1)', color: '#27ae60' },
    COMPLETED:   { label: '완료', bg: 'var(--surface2)', color: 'var(--text-muted)' },
  }
  const s = map[status] || { label: status, bg: 'var(--surface2)', color: 'var(--text-muted)' }
  return <span style={{ ...styles.badge, background: s.bg, color: s.color }}>{s.label}</span>
}

function RideCard({ ride, isDriver, onStart, onComplete }) {
  const remainingMs = useCountdown(ride.departureTime)

  return (
    <div style={styles.rideCard}>
      <div style={styles.rideTop}>
        <RideStatusBadge status={ride.status} />
        <span style={styles.rideId}>운행 #{ride.id}</span>
      </div>

      {ride.departureLocation && (
        <div style={{ ...styles.rideMeta, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
          <span style={{ fontWeight: 600, color: 'var(--text)' }}>{ride.departureLocation}</span>
          <span style={{ color: 'var(--accent)' }}>→</span>
          <span style={{ fontWeight: 600, color: 'var(--text)' }}>{ride.destinationLocation}</span>
        </div>
      )}

      {ride.departureTime && (
        <div style={styles.rideMeta}>
          출발: {new Date(ride.departureTime).toLocaleString('ko-KR')}
          {ride.status === 'SCHEDULED' && remainingMs !== null && remainingMs > 0 && (
            <span style={{ marginLeft: '0.5rem', color: remainingMs <= 30 * 60 * 1000 ? '#27ae60' : 'var(--text-muted)', fontSize: '0.75rem' }}>
              ({Math.floor(remainingMs / 60000)}분 후)
            </span>
          )}
        </div>
      )}
      {ride.startedAt && (
        <div style={styles.rideMeta}>시작: {new Date(ride.startedAt).toLocaleString('ko-KR')}</div>
      )}
      {ride.completedAt && (
        <div style={styles.rideMeta}>완료: {new Date(ride.completedAt).toLocaleString('ko-KR')}</div>
      )}

      {isDriver && ride.status === 'SCHEDULED' && (
        <button style={styles.actionBtn} onClick={() => onStart(ride.id)}>운행 시작</button>
      )}
      {isDriver && ride.status === 'IN_PROGRESS' && (
        <button style={{ ...styles.actionBtn, ...styles.actionBtnDanger }} onClick={() => onComplete(ride.id)}>
          운행 종료
        </button>
      )}

      {!isDriver && ride.status === 'COMPLETED' && (
        <ReviewSection ride={ride} />
      )}
    </div>
  )
}

export default function RidePage() {
  const [driverRides, setDriverRides] = useState([])
  const [passengerRides, setPassengerRides] = useState([])
  const [loadingDriver, setLoadingDriver] = useState(true)
  const [loadingPassenger, setLoadingPassenger] = useState(true)
  const [error, setError] = useState('')

  const activeDriverRide = driverRides.find(r => r.status === 'IN_PROGRESS' || r.status === 'SCHEDULED') ?? null
  const activePassengerRide = passengerRides.find(r => r.status === 'IN_PROGRESS' || r.status === 'SCHEDULED') ?? null

  const loadRides = useCallback(async () => {
    setLoadingDriver(true)
    setLoadingPassenger(true)
    getMyRidesAsDriver()
      .then(data => setDriverRides(data || []))
      .catch(() => setError('운행 목록을 불러오지 못했습니다.'))
      .finally(() => setLoadingDriver(false))
    getMyRidesAsPassenger()
      .then(data => setPassengerRides(data || []))
      .catch(() => {})
      .finally(() => setLoadingPassenger(false))
  }, [])

  useEffect(() => { loadRides() }, [loadRides])

  async function handleStart(rideId) {
    try {
      const updated = await startRide(rideId)
      setDriverRides(prev => prev.map(r => r.id === rideId ? updated : r))
    } catch (e) {
      setError(e.message || '운행 시작에 실패했습니다.')
    }
  }

  async function handleComplete(rideId) {
    try {
      const updated = await completeRide(rideId)
      setDriverRides(prev => prev.map(r => r.id === rideId ? updated : r))
    } catch (e) {
      setError(e.message || '운행 종료에 실패했습니다.')
    }
  }

  return (
    <div style={styles.page}>
      {error && <div style={styles.errorBox}>{error}</div>}

      {activeDriverRide && (
        <ActiveRidePanel ride={activeDriverRide} isDriver />
      )}
      {activePassengerRide && !activeDriverRide && (
        <ActiveRidePanel ride={activePassengerRide} isDriver={false} />
      )}

      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.dot} />
          <h2 style={styles.cardTitle}>내 운행 (드라이버)</h2>
        </div>
        {loadingDriver ? (
          <div style={styles.empty}><p style={styles.emptyText}>불러오는 중...</p></div>
        ) : driverRides.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>🚗</div>
            <p style={styles.emptyText}>등록된 운행이 없습니다</p>
          </div>
        ) : (
          <div style={styles.rideList}>
            {driverRides.map(r => (
              <RideCard key={r.id} ride={r} isDriver onStart={handleStart} onComplete={handleComplete} />
            ))}
          </div>
        )}
      </section>

      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.dot} />
          <h2 style={styles.cardTitle}>내 탑승 내역 (승객)</h2>
        </div>
        {loadingPassenger ? (
          <div style={styles.empty}><p style={styles.emptyText}>불러오는 중...</p></div>
        ) : passengerRides.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>🧳</div>
            <p style={styles.emptyText}>탑승 내역이 없습니다</p>
          </div>
        ) : (
          <div style={styles.rideList}>
            {passengerRides.map(r => (
              <RideCard key={r.id} ride={r} isDriver={false} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

const styles = {
  page: { display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 720 },
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.2rem' },
  dot: { width: 7, height: 7, background: 'var(--accent)', borderRadius: '50%', flexShrink: 0 },
  cardTitle: { fontSize: '1rem', fontWeight: 700, color: 'var(--text)', margin: 0 },
  empty: { textAlign: 'center', padding: '1.5rem 1rem', color: 'var(--text-muted)' },
  emptyIcon: { fontSize: '2rem', marginBottom: '0.6rem', opacity: 0.4 },
  emptyText: { fontWeight: 600, fontSize: '0.9rem', margin: 0, color: 'var(--text-muted)' },
  errorBox: {
    color: 'var(--accent3, #c0392b)', fontSize: '0.85rem',
    background: 'rgba(192,57,43,0.06)', borderRadius: 10, padding: '0.8rem 1rem',
  },
  rideList: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  rideCard: {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '1rem',
  },
  rideTop: { display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' },
  badge: {
    fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem',
    borderRadius: 6, flexShrink: 0,
  },
  rideId: { fontSize: '0.78rem', color: 'var(--text-muted)' },
  rideMeta: { fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.2rem' },
  actionBtn: {
    marginTop: '0.8rem', background: 'var(--accent)', color: '#fff',
    border: 'none', borderRadius: 7, padding: '0.4rem 0.9rem',
    fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
  },
  actionBtnDanger: { background: 'rgba(192,57,43,0.1)', color: 'var(--accent3, #c0392b)' },
  activeBadge: {
    fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 100,
    background: 'rgba(39,174,96,0.12)', color: '#27ae60',
  },
  passengerRow: {
    display: 'flex', alignItems: 'center', gap: '0.6rem',
    background: 'var(--surface)', borderRadius: 8, padding: '0.7rem 0.9rem',
    border: '1px solid var(--border)',
  },
  passengerId: { fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.15rem' },
  smallBtn: {
    background: 'var(--accent)', color: '#fff', border: 'none',
    borderRadius: 6, padding: '0.3rem 0.7rem',
    fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
  },
  smallBtnDanger: { background: 'rgba(192,57,43,0.1)', color: 'var(--accent3, #c0392b)' },
  routeBox: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    marginBottom: '0.8rem', fontSize: '0.88rem',
  },
  routeFrom: { fontWeight: 600, color: 'var(--text)' },
  routeTo: { fontWeight: 600, color: 'var(--text)' },
  countdownBox: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    background: 'var(--surface2)', borderRadius: 8, padding: '0.6rem 0.9rem',
    marginBottom: '0.8rem',
  },
  reviewSection: {
    marginTop: '0.8rem', paddingTop: '0.8rem',
    borderTop: '1px solid var(--border)',
  },
  reviewBtn: {
    background: '#f0c040', color: '#333',
    border: 'none', borderRadius: 7, padding: '0.5rem 1rem',
    fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer',
    width: '100%',
  },
  reviewDone: {
    textAlign: 'center', fontSize: '0.82rem', color: '#27ae60',
    fontWeight: 700, padding: '0.4rem',
  },
}
