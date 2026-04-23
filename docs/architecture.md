# Architecture

## 전체 구조

```
index.html
  └── main.jsx (ReactDOM.createRoot)
        └── App.jsx
              ├── useCarpool() ← 전체 상태 허브
              ├── LoginPage      (isLoggedIn=false 일 때)
              ├── Nav
              ├── Hero
              ├── SearchSection
              ├── CarpoolCard[]  (currentView='card')
              ├── MapView        (currentView='map')
              ├── PostModal      (showPostModal=true)
              ├── DetailModal    (selectedPost != null)
              └── Toast          (toast 메시지 있을 때)
```

## 데이터 흐름

```
useCarpool.js (단일 상태 저장소)
    │
    ▼
App.jsx (훅 결과를 props로 분배)
    │
    ├──▶ Nav         (currentPage, setPage, setShowPostModal)
    ├──▶ SearchSection(searchQuery, selectedTagFilters, handlers)
    ├──▶ CarpoolCard  (post data, onOpenDetail)
    ├──▶ MapView      (filteredPosts, onOpenDetail)
    ├──▶ DetailModal  (selectedPost, joinCarpool)
    └──▶ PostModal    (addPost)
```

## 페이지 상태 전환

```
앱 시작
  └→ isLoggedIn=false → LoginPage
       └→ 로그인 성공 → isLoggedIn=true
            └→ currentPage='list' (기본)
                 ├→ currentView='card' : CarpoolCard 그리드
                 └→ currentView='map'  : MapView (Leaflet)
            └→ currentPage='my'
                 └→ 내 카풀 목록 (isMe=true 필터)
```

## 필터링 로직 (`useCarpool.js` — `filteredPosts`)

`useMemo`로 계산. 적용 순서:

1. **페이지 필터** — `currentPage='my'`면 `post.isMe=true`만
2. **출발지 검색** — `searchQuery.from` substring match (대소문자 무시)
3. **도착지 검색** — `searchQuery.to` substring match
4. **날짜 필터** — `searchQuery.date` 일치
5. **퀵 필터** (`currentFilter`)
   - `today` — 오늘 날짜 일치
   - `seats` — `filled < seats` (빈 자리 있음)
   - `cheap` — `price` 오름차순 정렬
6. **태그 필터** — `selectedTagFilters` Set의 모든 태그를 post.tags가 포함해야 함 (AND 조건)

## 외부 의존성

| 라이브러리 | 용도 | 로드 방식 |
|---|---|---|
| Leaflet | 지도 렌더링 | npm + CDN CSS |
| OpenStreetMap | 지도 타일 | 런타임 API 호출 |
| Google Fonts | Noto Sans KR, Space Mono | CDN (index.html) |
