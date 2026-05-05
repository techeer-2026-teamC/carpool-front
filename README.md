# Carpool Frontend

React + Vite 기반의 카풀 서비스 프론트엔드입니다.

## 실행 방법

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

`.env.example`을 복사해 `.env` 파일을 생성하고 카카오 API 키를 입력합니다.

```bash
cp .env.example .env
```

```env
VITE_KAKAO_JS_KEY=발급받은_JavaScript_키
VITE_KAKAO_REST_API_KEY=발급받은_REST_API_키
```

카카오 API 키는 [Kakao Developers](https://developers.kakao.com)에서 발급받을 수 있습니다.
앱 생성 후 플랫폼 → Web에 `http://localhost:5173`을 등록해야 합니다.

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:5173` 으로 접속하세요.

### 4. 빌드

```bash
npm run build
```

### 5. 빌드 결과물 미리보기

```bash
npm run preview
```

## 기술 스택

- React 18
- Vite
- 카카오맵 SDK (지도 및 장소 검색)
