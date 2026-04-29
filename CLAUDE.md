# Carpool Frontend — CLAUDE.md

## Project Overview

한국어 기반 실시간 카풀 매칭 서비스의 프론트엔드. React + Vite SPA로, 백엔드 API 연동 전 목업 데이터로 동작 중.

## Tech Stack

- **React 18** + **Vite 5** (JSX, HMR)
- **Leaflet 1.9** — 인터랙티브 지도
- **Google Fonts** — Noto Sans KR, Space Mono
- 상태관리: Redux/Context 없음 — 커스텀 훅 단일 패턴

## Directory Structure

```
src/
├── App.jsx              # 최상위 컴포넌트, useCarpool 훅 연결 허브
├── main.jsx             # ReactDOM 진입점
├── index.css            # CSS 변수 + 전역 스타일
├── components/
│   ├── Nav.jsx          # 상단 네비게이션
│   ├── Hero.jsx         # 랜딩 히어로 섹션
│   ├── LoginPage.jsx    # 로그인/회원가입 폼
│   ├── SearchSection.jsx# 검색 + 태그 필터
│   ├── CarpoolCard.jsx  # 카풀 카드 (fmtDate, fmtPrice, TagPill export)
│   ├── DetailModal.jsx  # 카풀 상세 + 참여 모달
│   ├── PostModal.jsx    # 카풀 등록 모달
│   ├── MapView.jsx      # Leaflet 지도 뷰
│   └── Toast.jsx        # 알림 토스트 (2.5초 자동 해제)
├── hooks/
│   └── useCarpool.js    # 전체 상태 + 액션 관리 커스텀 훅
└── data/
    ├── mockData.js      # 목업 데이터 생성기 (generateMockPosts)
    └── tags.js          # 태그 정의 및 색상 매핑
```

## Dev Commands

```bash
npm install      # 의존성 설치
npm run dev      # 개발 서버 (localhost:5173)
npm run build    # 프로덕션 빌드 → dist/
npm run preview  # 빌드 결과 미리보기
```

## Code Conventions

### 스타일링
- **인라인 스타일만 사용** — CSS 모듈, Tailwind 없음
- 각 컴포넌트 상단에 `const styles = { ... }` 객체로 정의
- 색상은 반드시 `index.css`의 CSS 변수 사용 (`var(--accent)` 등)
- 새 CSS 변수가 필요하면 `index.css`에 추가 후 사용

### 컴포넌트
- **함수형 컴포넌트만** 사용 (클래스 컴포넌트 금지)
- props drilling으로 상태 전달 (App.jsx → 각 컴포넌트)
- 모달 오버레이는 배경 클릭 시 닫힘 처리 필수

### 상태 관리
- 모든 전역 상태는 `useCarpool.js`에서 관리
- 새 상태/액션 추가 시 반드시 `useCarpool.js`에 추가
- `useMemo`로 파생 상태(filteredPosts, myPosts) 계산
- `useCallback`으로 액션 함수 최적화

### 데이터 구조
```js
// Post 객체
{ id, from, to, date, time, seats, filled, price, nickname, desc, color, rating, trips, isMe, tags }

// Tag 객체
{ id, label, emoji, bg, tc }

// SearchQuery
{ from: string, to: string, date: string }
```

### ID 생성
```js
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
```

### 지도 (Leaflet)
- 팝업에서 상세보기 열기: `window.__openDetail` 전역 함수 사용
- OpenStreetMap 타일 사용 (외부 의존성)

## Pages

| `currentPage` 값 | 화면 |
|---|---|
| `'list'` | 카풀 목록 (카드뷰 / 지도뷰 토글) |
| `'my'` | 내 카풀 목록 (삭제 가능) |

로그인 상태(`isLoggedIn`)가 false면 LoginPage 렌더링.

## API 연동 계획

현재 `mockData.js`의 목업 데이터 사용 중. API 연동 시:
- `useCarpool.js`의 `addPost()`, `deletePost()`, `joinCarpool()` 함수에서 fetch/axios 호출로 교체
- `generateMockPosts()` 제거 후 초기 로드를 API 호출로 대체

## Responsive Breakpoint

- 모바일: `760px` 이하 (`index.css` 미디어 쿼리)

## 카카오맵 API 연동 계획

### 목적
현재 게시글 등록 시 출발지/목적지를 자유 텍스트로 입력하면 `LOCATION_COORDS`에 없는 지역은 좌표가 null로 저장되어 지도에 마커가 표시되지 않음. 카카오맵 API로 텍스트 → 좌표 변환을 자동화.

### 사용 API
- **카카오 로컬 API** — 키워드 검색 (`/v2/local/search/keyword.json`)
- REST API 키 필요 (https://developers.kakao.com)
- 무료 티어: 일 300,000건

### 작업 범위

#### 프론트엔드
1. `PostModal.jsx` — 출발지/목적지 입력 시 카카오 키워드 검색 API 호출 → 자동완성 드롭다운 표시
2. 사용자가 결과 선택 시 `departureLat`, `departureLng` (또는 `destinationLat`, `destinationLng`) 세팅
3. `LOCATION_COORDS` fallback 의존 제거 (mockData.js에서 좌표 매핑 역할 분리)
4. API 키는 `.env`의 `VITE_KAKAO_REST_API_KEY`로 관리

#### 백엔드
- 별도 작업 없음 — `Post` 엔티티에 좌표 필드 이미 존재, 프론트에서 좌표 포함해서 전송하면 그대로 저장됨

### 구현 순서
1. 카카오 개발자 콘솔에서 앱 생성 → REST API 키 발급
2. `.env`에 `VITE_KAKAO_REST_API_KEY=...` 추가
3. `src/api/kakao.js` 생성 — 키워드 검색 함수
4. `PostModal.jsx` 입력 필드에 자동완성 연동
5. `mockData.js`의 `LOCATION_COORDS`는 시드 데이터 fallback용으로만 유지
