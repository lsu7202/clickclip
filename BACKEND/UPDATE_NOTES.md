# BACKEND 환경 설정 완료

## ✅ 생성된 파일 & 폴더 구조

```
BACKEND/
├── .env.example              ✅ 환경 변수 템플릿
├── package.json              ⏳ 수정 필요 (bcrypt, jwt, joi, helmet 추가)
├── src/
│   ├── index.js              ⏳ 수정 필요 (helmet, 라우트, 에러핸들러 추가)
│   ├── config/
│   │   └── db.js             ✅ PostgreSQL 연결
│   ├── middleware/
│   │   ├── auth.js           ✅ JWT 인증
│   │   ├── validation.js     ✅ Joi 검증 미들웨어
│   │   └── errorHandler.js   ✅ 에러 처리
│   ├── utils/
│   │   ├── token.js          ✅ JWT 토큰 생성/검증
│   │   └── response.js       ✅ API 응답 표준화
│   ├── controllers/
│   │   ├── auth.js           ✅ 인증 컨트롤러 (스켈레톤)
│   │   ├── works.js          ✅ 작업 컨트롤러 (스켈레톤)
│   │   └── payments.js       ✅ 결제 컨트롤러 (스켈레톤)
│   ├── routes/
│   │   ├── auth.js           ✅ 인증 라우트
│   │   ├── works.js          ✅ 작업 라우트
│   │   └── payments.js       ✅ 결제 라우트
│   ├── migrations/
│   │   ├── 001_init.sql      ✅ DB 테이블 + 함수 + 트리거
│   │   └── init.js           ✅ 마이그레이션 실행 스크립트
│   └── cron/
│       └── scheduler.js      ✅ 일일 권한 만료 체크
```

## 🔧 수동 수정 필요

### 1️⃣ package.json
```json
"dependencies": {
  "express": "^4.18.2",
  "pg": "^8.11.3",
  "dotenv": "^16.3.1",
  "node-cron": "^3.0.3",
  "cors": "^2.8.5",
  "bcrypt": "^5.1.1",          // ← 추가
  "jsonwebtoken": "^9.1.2",    // ← 추가
  "joi": "^17.11.1",           // ← 추가
  "helmet": "^7.1.0",          // ← 추가
  "express-async-errors": "^3.1.1"  // ← 추가
}
```

### 2️⃣ src/index.js
- Line 2: `const helmet = require('helmet');` 추가
- Line 3: `require('express-async-errors');` 추가
- Line 11-12: helmet() 미들웨어 추가
- Line 18-20: 라우트 등록
- Line 27-31: 에러 핸들러 추가

## 🚀 실행 단계

### 1단계: 의존성 설치
```bash
cd BACKEND
npm install
```

### 2단계: 환경 설정
```bash
cp .env.example .env
# .env 파일 편집 (DATABASE_URL 등)
```

### 3단계: DB 마이그레이션
```bash
npm run migrate
```

### 4단계: 개발 서버 시작
```bash
npm run dev
```

## 📝 다음 단계

1. package.json 수정 (의존성 추가)
2. src/index.js 수정 (helmet, 라우트, 에러핸들러)
3. `npm install` 실행
4. DB 마이그레이션 실행
5. API 컨트롤러 구현 (TODO 부분들)
6. 인증 로직 구현 (bcrypt, JWT)

## 🔗 API 엔드포인트 (구현 준비 완료)

- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `POST /api/auth/logout` - 로그아웃
- `GET /api/auth/me` - 세션 조회
- `GET /api/works` - 작업 목록
- `POST /api/works` - 작업 생성
- `GET /api/works/:workId` - 작업 조회
- `POST /api/works/:workId/draft` - 임시 저장
- `POST /api/works/:workId/render` - 렌더링 시작
- `GET /api/payments/plans` - 요금제 조회
- `POST /api/payments` - 결제 요청
- `GET /api/payments/:paymentId` - 결제 상태 조회
- `POST /api/payments/:paymentId/approve` - 결제 승인 (관리자)
