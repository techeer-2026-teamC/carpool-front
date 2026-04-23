# Styling Guide

## 원칙

- **인라인 스타일 전용** — CSS 모듈, Tailwind, styled-components 사용 안 함
- 색상/간격 등 디자인 토큰은 `src/index.css`의 CSS 변수에서만 참조
- 각 컴포넌트 상단에 `const styles = { ... }` 객체로 스타일 정의

```jsx
// 컴포넌트 예시
const styles = {
  card: { background: 'var(--surface)', borderRadius: 16, padding: '20px' },
  title: { color: 'var(--text)', fontWeight: 700 },
};

<div style={styles.card}>
  <span style={styles.title}>제목</span>
</div>
```

---

## CSS 변수 (`src/index.css`)

### 색상

| 변수 | 값 | 용도 |
|---|---|---|
| `--bg` | `#f7f6f2` | 페이지 배경 |
| `--surface` | `#ffffff` | 카드/모달 배경 |
| `--surface2` | `#f2f0eb` | 보조 배경 |
| `--border` | `#e4e0d8` | 테두리 |
| `--accent` | `#6b7c3f` | 주 강조색 (녹색) |
| `--accent-light` | `#8a9e50` | 밝은 강조색 |
| `--accent-pale` | `#eef1e6` | 매우 연한 강조색 |
| `--accent2` | `#4a5a2a` | 짙은 녹색 |
| `--accent3` | `#c0392b` | 에러/경고 (빨강) |
| `--text` | `#2a2a1f` | 기본 텍스트 |
| `--text-muted` | `#7a7a6a` | 보조 텍스트 |
| `--text-dim` | `#b5b5a5` | 흐린 텍스트 |

### 그림자

| 변수 | 용도 |
|---|---|
| `--card-glow` | `0 2px 16px rgba(107, 124, 63, 0.08)` — 카드 기본 그림자 |

---

## 태그 색상 (`src/data/tags.js`)

각 태그는 고유한 배경색(`bg`)과 텍스트색(`tc`)을 가짐.

```js
{ id: 'women', label: '여성 전용', emoji: '👩', bg: '#fce4ec', tc: '#c2185b' }
{ id: 'pet',   label: '반려동물', emoji: '🐾', bg: '#e8f5e9', tc: '#388e3c' }
// ...
```

새 태그 추가 시 `tags.js`에 항목 추가.

---

## 레이아웃 패턴

### 카드 그리드
```css
display: grid;
grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
gap: 20px;
```

### 모달 오버레이
```js
{
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.45)',
  backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000,
}
```

### 글래스모피즘 (Nav, 지도 사이드바)
```js
{
  background: 'rgba(255,255,255,0.85)',
  backdropFilter: 'blur(12px)',
  borderBottom: '1px solid var(--border)',
}
```

---

## 반응형

단일 브레이크포인트: **760px** (`src/index.css` 미디어 쿼리)

```css
@media (max-width: 760px) {
  /* 모바일 스타일 */
}
```

---

## 배경 패턴

`body::before` 의사 요소로 도트 패턴 배경 적용 (CSS 변경 시 `index.css` 수정).
