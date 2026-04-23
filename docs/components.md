# Components

## App.jsx

최상위 컴포넌트. `useCarpool()` 훅을 호출하고 모든 자식 컴포넌트에 props로 상태/액션을 분배. 렌더 로직 외에 비즈니스 로직 없음.

---

## Nav.jsx

**Props:** `currentPage`, `onChangePage`, `onOpenPost`, `isLoggedIn`, `nickname`

상단 고정 네비게이션 바. 백드롭 블러 효과 적용.
- 로고 클릭 → `currentPage='list'`
- "내 카풀" 클릭 → `currentPage='my'`
- "카풀 등록" 버튼 → PostModal 열기

---

## LoginPage.jsx

**Props:** `onLogin`

로그인 / 회원가입 탭 전환 폼. Enter 키 제출 지원.
- 로그인 성공 시 `onLogin(nickname)` 호출

---

## Hero.jsx

**Props:** `postCount`, `userCount`, `matchCount`

랜딩 히어로 섹션. 통계 수치 표시 (현재 posts 배열 기반 계산).

---

## SearchSection.jsx

**Props:** `searchQuery`, `onSearch`, `currentFilter`, `onFilter`, `selectedTagFilters`, `onToggleTag`

- 출발지 / 도착지 / 날짜 입력 → `onSearch(query)` 호출
- 퀵 필터 버튼 (`전체` / `오늘` / `빈 자리` / `저렴한 순`)
- 태그 필터 버튼 (다중 선택, AND 조건)

---

## CarpoolCard.jsx

**Props:** `post`, `onOpenDetail`

카풀 목록 카드 아이템. 유틸 함수/컴포넌트도 export:

```js
export fmtDate(dateStr)     // "2024-06-01" → "6월 1일 (토)"
export fmtPrice(price)      // 1500 → "1,500원"
export TagPill({ tag })     // 태그 뱃지 컴포넌트
```

---

## DetailModal.jsx

**Props:** `post`, `onClose`, `onJoin`

카풀 상세 정보 + 참여 신청 모달. 배경 클릭 시 `onClose()`.
- 내부 `FormGroup`, `MetaItem` 헬퍼 컴포넌트 정의
- `onJoin(postId)` → 자리 차감 후 토스트 표시

---

## PostModal.jsx

**Props:** `onClose`, `onSubmit`

카풀 등록 폼 모달. 배경 클릭 시 `onClose()`.
- 출발지, 도착지, 날짜, 시간, 총 인원, 가격, 태그, 설명 입력
- 제출 시 `onSubmit(postData)` → `useCarpool.addPost()` 호출

---

## MapView.jsx

**Props:** `posts`, `onOpenDetail`

Leaflet 기반 인터랙티브 지도. 사이드바 + 지도 분할 레이아웃.
- 각 카풀 위치에 커스텀 마커 표시
- 마커 클릭 → 팝업 표시
- 팝업 내 "상세보기" → `window.__openDetail(postId)` 전역 함수 호출

> **주의:** `window.__openDetail`은 MapView 마운트 시 등록되는 전역 함수. Leaflet 팝업이 React 외부에서 렌더링되기 때문에 사용.

---

## Toast.jsx

**Props:** `message`, `onHide`

화면 하단 토스트 알림. `message`가 있으면 표시, 2.5초 후 `onHide()` 자동 호출.
