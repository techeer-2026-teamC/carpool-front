# State Management

## 패턴: 단일 커스텀 훅

Redux, Context API 없이 `src/hooks/useCarpool.js` 한 파일에서 전체 상태 관리.  
`App.jsx`에서 훅을 호출하고 반환값을 props로 자식 컴포넌트에 전달.

```js
// App.jsx
const { posts, filteredPosts, addPost, ... } = useCarpool();
```

---

## 상태 목록

| 상태 | 타입 | 초기값 | 설명 |
|---|---|---|---|
| `posts` | `Post[]` | `generateMockPosts()` | 전체 카풀 게시글 |
| `currentPage` | `string` | `'list'` | `'list'` \| `'my'` |
| `currentView` | `string` | `'card'` | `'card'` \| `'map'` |
| `currentFilter` | `string` | `'all'` | `'all'` \| `'today'` \| `'seats'` \| `'cheap'` |
| `searchQuery` | `object` | `{from:'',to:'',date:''}` | 검색 입력값 |
| `selectedTagFilters` | `Set<string>` | `new Set()` | 선택된 태그 ID 집합 |
| `selectedPost` | `Post\|null` | `null` | DetailModal에서 보여줄 게시글 |
| `showPostModal` | `boolean` | `false` | PostModal 표시 여부 |
| `isLoggedIn` | `boolean` | `false` | 로그인 상태 |
| `nickname` | `string` | `''` | 현재 로그인 사용자 닉네임 |
| `toast` | `string` | `''` | 토스트 메시지 (빈 문자열이면 숨김) |

---

## 파생 상태 (useMemo)

### `filteredPosts`
필터 조건 전체 적용 후 결과. 의존성: `posts`, `currentPage`, `searchQuery`, `currentFilter`, `selectedTagFilters`.

### `myPosts`
`posts.filter(p => p.isMe)`. 의존성: `posts`.

---

## 액션 (useCallback)

### `addPost(postData)`
새 게시글 추가. `genId()`로 ID 생성, `isMe: true` 설정 후 `posts` 앞에 추가.

### `deletePost(id)`
`posts`에서 해당 ID 제거.

### `joinCarpool(id)`
해당 게시글의 `filled` 1 증가. `filled >= seats`면 토스트 "이미 마감된 카풀입니다" 표시.

### `toggleTagFilter(tagId)`
`selectedTagFilters` Set에서 토글 (있으면 삭제, 없으면 추가).

### `login(nickname)` / `logout()`
`isLoggedIn`, `nickname` 상태 변경.

### `showToast(message)`
`toast` 설정. Toast 컴포넌트가 2.5초 후 `hideToast()` 호출.

---

## API 연동 시 변경 포인트

현재 모든 상태가 클라이언트 메모리에만 존재 (새로고침 시 초기화).  
백엔드 연동 시 아래 함수를 수정:

```js
// useCarpool.js

// 초기 로드
useEffect(() => {
  // 현재: generateMockPosts()
  // 변경: const data = await api.getPosts(); setPosts(data);
}, []);

// addPost
const addPost = useCallback(async (postData) => {
  // 현재: setPosts(prev => [newPost, ...prev])
  // 변경: const created = await api.createPost(postData); setPosts(prev => [created, ...prev]);
}, []);

// deletePost
const deletePost = useCallback(async (id) => {
  // 변경: await api.deletePost(id); setPosts(prev => prev.filter(...));
}, []);

// joinCarpool
const joinCarpool = useCallback(async (id) => {
  // 변경: await api.joinPost(id); 서버 응답으로 posts 업데이트
}, []);
```
