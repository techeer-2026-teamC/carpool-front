export const LOCATION_COORDS = {
  강남역:         [37.4979, 127.0276],
  홍대입구:       [37.5572, 126.9247],
  신촌:           [37.5552, 126.9369],
  잠실역:         [37.5133, 127.1001],
  판교역:         [37.3943, 127.1110],
  여의도역:       [37.5215, 126.9242],
  구로디지털단지: [37.4851, 126.9012],
  강변역:         [37.5347, 127.0942],
  수원역:         [37.2664, 127.0003],
  서울역:         [37.5547, 126.9707],
  인천공항:       [37.4602, 126.4407],
  인천역:         [37.4729, 126.6215],
  강남구청역:     [37.5170, 127.0412],
  분당:           [37.3820, 127.1197],
  삼성역:         [37.5088, 127.0630],
  광명역:         [37.4133, 126.8651],
  영등포구청역:   [37.5260, 126.8963],
}

const ROUTES = [
  { from: '강남역', to: '판교역' },
  { from: '홍대입구', to: '여의도역' },
  { from: '신촌', to: '구로디지털단지' },
  { from: '잠실역', to: '강변역' },
  { from: '수원역', to: '서울역' },
  { from: '인천공항', to: '강남구청역' },
  { from: '분당', to: '삼성역' },
  { from: '광명역', to: '영등포구청역' },
  { from: '강남역', to: '서울역' },
  { from: '홍대입구', to: '강남역' },
]

const COLORS = ['#6b7c3f', '#8a9e50', '#4a5a2a', '#a0845c', '#7a9a6b', '#5c7a4a']
const NAMES  = ['김민준', '이서연', '박지호', '최예린', '정우성', '강다은', '윤재원', '임소희']

const SAMPLE_TAGS = [
  ['no-smoke', 'quiet', 'ac'],
  ['coffee', 'chatty', 'music'],
  ['no-smoke', 'quiet'],
  ['smoke-ok', 'chatty'],
  ['coffee', 'fast', 'no-smoke'],
  ['quiet', 'no-music', 'ac'],
  ['ladies', 'no-smoke', 'quiet'],
  ['beginner', 'coffee'],
  ['pro', 'fast', 'music'],
  ['no-smoke', 'chatty', 'window'],
]

const DESCS = [
  '정시 출발합니다. 연락 주세요!',
  '경유지 없이 직행입니다.',
  '',
  '짐이 많으신 분은 미리 말씀해 주세요.',
  '',
  '반드시 제시간에 탑승 부탁드립니다.',
  '',
  '처음 카풀 해봐요, 잘 부탁드립니다!',
  '',
  '음악 같이 들어요 🎶',
]

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}
function rnd(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function generateMockPosts() {
  const today = new Date()
  return ROUTES.map((r, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() + Math.floor(Math.random() * 6))
    const h = 7 + Math.floor(Math.random() * 13)
    const m = Math.random() > 0.5 ? '00' : '30'
    const seats = 1 + Math.floor(Math.random() * 4)
    const filled = Math.floor(Math.random() * seats)
    return {
      id: genId(),
      from: r.from,
      to: r.to,
      date: d.toISOString().split('T')[0],
      time: `${String(h).padStart(2, '0')}:${m}`,
      seats,
      filled,
      price: Math.random() > 0.3 ? String((2 + Math.floor(Math.random() * 8)) * 1000) : '',
      nickname: rnd(NAMES),
      desc: DESCS[i] || '',
      color: rnd(COLORS),
      rating: (4 + Math.random()).toFixed(1),
      trips: 10 + Math.floor(Math.random() * 200),
      isMe: false,
      tags: SAMPLE_TAGS[i] || [],
    }
  })
}
