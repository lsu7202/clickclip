# 🎬 YourFactory - AI 쇼츠 제작 플랫폼

> AI를 활용한 자동화된 쇼츠(Short-form) 영상 제작 및 편집 플랫폼

---

## 📋 프로젝트 개요

**목표**: 원본 영상 분석 → 자막/대사 각색 → TTS 음성 생성 → FFMPEG 합성 → 최종 다운로드

**기술 스택**:
- **Frontend**: React 18+, React Router v6, Tailwind CSS, lucide-react
- **Backend**: Node.js/Express, PostgreSQL, node-cron
- **AI/Media**: FastAPI, Gemini API, FFMPEG, Redis 
- **Containerization**: Docker & Docker Compose

**프로젝트 상태**: 🟡 **배포 준비중**

---


## 🌐 프론트엔드 기대 명세 (API)

### **라우팅 구조**
```
/                       → Landing (인증 여부 체크 후 분기)
/login                  → Login 페이지
/register               → Register 페이지
/dashboard              → Dashboard 
/editor/:id             → 작업 생성/편집
/pricing                → 요금제 페이지
/payment                → 결제 페이지
/admin                  → 관리자 대시보드
```

### **[필수] API 엔드포인트 명세**

#### **1️⃣ 인증 & 세션**
```javascript
// 로그인
POST /api/auth/login
Request:  { email, password }
Response: { userId, name, email, token, permission, credits }

// 회원가입
POST /api/auth/register
Request:  { email, password, name, phone, birthDate }
Response: { userId, email, name, token }

// 세션 조회
GET /api/me
Request: {userId}
Response: { userId, name, email, token, permission, credits }

```

#### **2️⃣ 작업 관리**
```javascript
// 작업 목록 조회 (사용자별)
GET /api/works?userId={userId}
Response: { 
  items: [
    { 
      workId, userId, title, status, 
      originalScript, editedScript, voicePreset,
      renderResult: { outputVideoUrl, downloadUrl },
      updatedAt 
    }
  ]
}

// 특정 작업 조회
GET /api/works/:workId
Response: { workId, title, status, originalScript, editedScript, ... }

// 새 작업 생성
POST /api/works
Request:  { userId, title, originalScript }
Response: { workId, status: 'NEW', ... }

// 임시 저장 (Draft 상태로 전환)
POST /api/works/:workId/draft
Request:  { editedScript, voicePreset }
Response: { workId, status: 'IN_PROGRESS', ... }

// 렌더링 시작
POST /api/works/:workId/render
Request:  { }
Response: { workId, status: 'RENDERING', ... }

// 다운로드 URL 조회
GET /api/works/:workId/download
Response: { downloadUrl, fileName }
```

#### **3️⃣ 결제 & 권한**
```javascript
// 구독 요금제 조회
GET /api/plans
Response: { items: [ { gradeName, displayName, credits, price, durationDays } ] }

// 결제 요청 (수동 입금)
POST /api/payments
Request:  { userId, gradeName }  // 'Pro', 'Premium', 'Basic'
Response: { paymentId, status: 'Pending', gradeName, bankInfo: { ... } }

// 결제 상태 조회
GET /api/payments/:paymentId
Response: { paymentId, status, gradeName, createdAt, amount }

// 관리자: 결제 승인
POST /api/admin/payments/:paymentId/approve
Request:  { paymentId }
Response: { paymentId, status: 'Success', creditsAdded, gradeName }
```

### **[현재 상태] mockWorks.js 함수**
```javascript
// 임시로 localStorage 기반 CRUD 제공
listWorksByUser(userId)           // 작업 목록
getWorkById(userId, workId)       // 특정 작업
createWork(userId, title)         // 작업 생성
saveWorkDraft(workId, data)       // 임시 저장 (IN_PROGRESS)
startWorkRender(workId)           // 렌더링 시작 (RENDERING)
completeWorkRender(workId, url)   // 렌더링 완료 (DONE)
```

**🎯 마이그레이션 계획**: 백엔드 API 완성 후 `worksApi.js` 추상화층 추가 → mockWorks → HTTP 자동 전환

---

## 🗄️ 예상 데이터베이스 명세

### **1️⃣ users (사용자)**
```sql
CREATE TABLE users (
  userId VARCHAR(50) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  passwordHash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  age INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **2️⃣ user_permissions (권한 상태)**
```sql
CREATE TABLE user_permissions (
  permissionId SERIAL PRIMARY KEY,
  userId VARCHAR(50) FOREIGN KEY → users(userId),
  status ENUM('Active', 'Pending', 'Expired') DEFAULT 'Pending',
  gradeName VARCHAR(50),           -- 'Pro', 'Premium', etc.
  startDate DATE,
  endDate DATE,
  remainingDays INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **3️⃣ user_credits (크레딧)**
```sql
CREATE TABLE user_credits (
  creditId SERIAL PRIMARY KEY,
  userId VARCHAR(50) FOREIGN KEY → users(userId),
  remainingCredits INT DEFAULT 0,
  totalUsedCredits INT DEFAULT 0,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **4️⃣ payments (결제 내역)**
```sql
CREATE TABLE payments (
  paymentId VARCHAR(50) PRIMARY KEY,
  userId VARCHAR(50) FOREIGN KEY → users(userId),
  gradeName VARCHAR(50),           -- 'Pro', 'Premium', 'Basic' (세션과 일관성)
  amount DECIMAL(10, 2),
  status ENUM('Pending', 'Success', 'Failed') DEFAULT 'Pending',
  creditsAdded INT,
  createdAt TIMESTAMP,
  approvedAt TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(userId),
  FOREIGN KEY (gradeName) REFERENCES plans(gradeName)
);
```

### **5️⃣ plans (구독 요금제)**
```sql
CREATE TABLE plans (
  gradeName VARCHAR(50) PRIMARY KEY,  -- 'Pro', 'Premium', 'Basic' (세션과 일관성)
  displayName VARCHAR(100),            -- 표시 이름 ('Pro 플랜', 'Premium 플랜')
  price DECIMAL(10, 2),
  credits INT,                        -- 제공 크레딧 수
  durationDays INT,                   -- 구독 기간 (일)
  createdAt TIMESTAMP
);
```

### **6️⃣ works (작업 내역)**
```sql
CREATE TABLE works (
  workId VARCHAR(50) PRIMARY KEY,
  userId VARCHAR(50) FOREIGN KEY → users(userId),
  title VARCHAR(255) NOT NULL,
  status ENUM('NEW', 'IN_PROGRESS', 'RENDERING', 'DONE', 'FAILED') DEFAULT 'NEW',
  originalScript TEXT,
  editedScript TEXT,
  voicePreset VARCHAR(100),
  outputVideoUrl VARCHAR(500),     -- 최종 영상 URL (S3, etc)
  downloadUrl VARCHAR(500),
  version INT DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(userId)
);
```

---

## 🐳 도커 구조

### **docker-compose.yml 구성**

```yaml
version: '3.8'

services:
  # Frontend
  frontend:
    build: ./FRONTEND
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_BASE_URL=http://localhost:5000
    depends_on:
      - backend

  # Backend
  backend:
    build: ./BACKEND
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://user:password@postgres:5432/yourfactory
      - NODE_ENV=development
      - PORT=5000
    depends_on:
      - postgres
    volumes:
      - ./shared_media:/app/media

  # AI Server
  ai:
    build: ./AI
    ports:
      - "8000:8000"
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - FFMPEG_PATH=/usr/bin/ffmpeg
    depends_on:
      - redis
    volumes:
      - ./shared_media:/app/media

  # PostgreSQL
  postgres:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=yourfactory
    volumes:
      - postgres_data:/var/lib/postgresql/data

  # Redis (비동기 작업 큐)
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

### **컨테이너 통신 구조**

```
┌─────────────────────────────────────────────┐
│  FRONTEND (React)                           │
│  http://localhost:3000                      │
└────────────┬────────────────────────────────┘
             │ API 요청 (fetch)
             ▼
┌─────────────────────────────────────────────┐
│  BACKEND (Node.js/Express)                  │
│  http://localhost:5000                      │
│  - /api/auth/*                              │
│  - /api/works/*                             │
│  - /api/payments/*                          │
└────────────┬──────────────────┬─────────────┘
             │                  │
             ▼                  ▼
    ┌──────────────┐    ┌──────────────────┐
    │  PostgreSQL  │    │  Redis (Queue)   │
    │  :5432       │    │  :6379           │
    └──────────────┘    └────────┬──────────┘
                                 │
                                 ▼ 비동기 작업
                        ┌──────────────────┐
                        │  AI Server       │
                        │  FastAPI         │
                        │  :8000           │
                        │  - /analyze      │
                        │  - /render       │
                        │  - /status       │
                        └──────────────────┘
```

---

## 🚀 실행 명령어

### **개발 환경 시작**
```bash
# 1. 모든 컨테이너 실행
docker-compose up --build -d

# 2. 로그 확인
docker-compose logs -f

# 3. 특정 서비스만 실행
docker-compose up -d frontend backend postgres
```

### **개발 서버 (로컬)**
```bash
# Frontend
cd FRONTEND && npm start          # http://localhost:3000

# Backend (별도 터미널)
cd BACKEND && npm install && npm start  # http://localhost:5000

# AI Server (별도 터미널)
cd AI && python -m uvicorn main:app --reload  # http://localhost:8000
```

---

## 📊 개발 진행 상황

### ✅ **완성**
- [x] 프론트엔드 기본 레이아웃 (Header, Footer)
- [x] 인증 페이지 (Login, Register)
- [x] Dashboard (작업 목록)
- [x] Editor (영상 편집 UI)
- [x] useSessionUser 훅 (mock fallback)
- [x] mockWorks 데이터층 (localStorage 기반)
- [x] React Hooks 에러 수정

### 🟡 **진행 중**
- [ ] Pricing 페이지 (요금제)
- [ ] Payment 페이지 (결제)
- [ ] Backend API 엔드포인트 구현
- [ ] PostgreSQL 마이그레이션

### ⏳ **예정**
- [ ] Admin Dashboard (관리자 결제 승인)
- [ ] AI 서버 고도화 (Gemini/FFMPEG 연동)
- [ ] Redis 작업 큐 연동
- [ ] 전체 통합 테스트
- [ ] 배포 준비

---

## 🔄 다음 단계

1. **Backend API 구현** (3-5일)
   - `/api/auth/*` 엔드포인트
   - `/api/works/*` CRUD 엔드포인트
   - `/api/payments/*` 결제 API

---

## ☁️ 배포 가이드 — Cloud Run + Memorystore (Redis)

간단 설명: Cloud Run은 무상태(serverless) 서비스이므로 Redis는 외부(관리형 서비스 또는 VM)에 배치해야 합니다. 권장 옵션은 Google Cloud Memorystore(Managed Redis)입니다.

**요약(간단 가이드)**
- **권장 구성**: Cloud Run(백엔드, AI 서비스) + Memorystore(Managed Redis) + Cloud SQL(또는 외부 Postgres)
- **핵심 단계**:
  1. GCP 프로젝트 및 리전 설정
  2. 필요한 API 활성화 (Cloud Run, Memorystore, VPC Access, Artifact Registry, Cloud Build, Secret Manager)
  3. Artifact Registry 생성 및 컨테이너 빌드/업로드
  4. Serverless VPC Access 커넥터 생성
  5. Memorystore 인스턴스 생성(프라이빗 IP)
  6. Cloud Run 서비스 배포 시 VPC 커넥터 연결 및 Redis 호스트 환경변수 설정

**요약 예시 커맨드 (빠른 실행)**
```bash
export PROJECT_ID=YOUR_PROJECT_ID
export REGION=asia-northeast3
export REPO=shortube-repo
gcloud config set project $PROJECT_ID
gcloud services enable run.googleapis.com redis.googleapis.com compute.googleapis.com vpcaccess.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com

# Artifact Registry 생성 (한 번만)
gcloud artifacts repositories create $REPO --repository-format=docker --location=$REGION --description="shortube images"

# 빌드 및 업로드 (예: backend)
gcloud builds submit ./BACKEND --tag=$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/backend:latest

# VPC 커넥터
gcloud compute networks vpc-access connectors create shortube-connector --region=$REGION --network=default --range=10.8.0.0/28

# Memorystore 생성
gcloud redis instances create shortube-redis --size=1 --region=$REGION --redis-version=redis_6_x --network=default

# Redis IP 조회
gcloud redis instances describe shortube-redis --region=$REGION --format="value(host)"

# Cloud Run 배포 (백엔드 예시)
gcloud run deploy shortube-backend \
  --image=$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/backend:latest \
  --platform=managed --region=$REGION --allow-unauthenticated \
  --vpc-connector=shortube-connector --vpc-egress=all-traffic \
  --set-env-vars=REDIS_HOST=<REDIS_IP>,REDIS_PORT=6379,DATABASE_URL=<DB_URL>,JWT_EXPIRES_IN=24h
```

---

### 전체(단계별 명령어) — 자세한 가이드

사전 준비: GCP 콘솔에 프로젝트가 있어야 하며 로컬에 `gcloud` CLI가 설치되어 있어야 합니다.

1) 기본 변수 설정

```bash
export PROJECT_ID=YOUR_PROJECT_ID
export REGION=asia-northeast3               # 권장: asia-northeast3(서울)
export REPO=shortube-repo
export NETWORK=default                      # 필요하면 전용 VPC 사용
gcloud config set project $PROJECT_ID
gcloud config set run/region $REGION
```

2) 필요한 API 활성화

```bash
gcloud services enable run.googleapis.com redis.googleapis.com compute.googleapis.com vpcaccess.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com
```

3) Artifact Registry 생성 (도커 레포)

```bash
gcloud artifacts repositories create $REPO \
  --repository-format=docker --location=$REGION --description="shortube containers"

export BACKEND_IMAGE=$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/backend:latest
export AI_IMAGE=$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/ai:latest
export FRONTEND_IMAGE=$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/frontend:latest
```

4) 컨테이너 빌드 및 업로드

```bash
# Backend
gcloud builds submit ./BACKEND --tag=$BACKEND_IMAGE

# AI 서버
gcloud builds submit ./AI --tag=$AI_IMAGE

# Frontend (선택적: static site로 호스팅 시 다른 옵션 고려)
gcloud builds submit ./FRONTEND --tag=$FRONTEND_IMAGE
```

5) Serverless VPC Access 커넥터 생성

```bash
gcloud compute networks vpc-access connectors create shortube-connector \
  --region=$REGION --network=$NETWORK --range=10.8.0.0/28
```

6) Memorystore(Managed Redis) 생성

```bash
# size는 GB 단위(1GB 권장으로 테스트용), redis-version은 필요에 따라 설정
gcloud redis instances create shortube-redis \
  --size=1 --region=$REGION --redis-version=redis_6_x --network=$NETWORK

# Redis의 호스트 IP 확인
REDIS_HOST=$(gcloud redis instances describe shortube-redis --region=$REGION --format="value(host)")
echo "Redis Host: $REDIS_HOST"
```

7) (권장) 비밀값은 Secret Manager에 보관

```bash
# 예: JWT_SECRET 저장
echo -n "your_jwt_secret" | gcloud secrets create JWT_SECRET --data-file=- --project=$PROJECT_ID

# DB 비밀번호 등도 동일하게 등록
```

8) Cloud Run 서비스 배포 — 백엔드 예시

```bash
gcloud run deploy shortube-backend \
  --image=$BACKEND_IMAGE \
  --platform=managed --region=$REGION \
  --allow-unauthenticated \
  --vpc-connector=shortube-connector --vpc-egress=all-traffic \
  --set-env-vars=REDIS_HOST=$REDIS_HOST,REDIS_PORT=6379,DATABASE_URL='postgres://USER:PASSWORD@HOST:5432/DB'
```

비밀을 Secret Manager에서 바로 마운트하려면:

```bash
gcloud run deploy shortube-backend \
  --image=$BACKEND_IMAGE \
  --platform=managed --region=$REGION \
  --vpc-connector=shortube-connector --vpc-egress=all-traffic \
  --set-secrets=JWT_SECRET=projects/$PROJECT_ID/secrets/JWT_SECRET:latest
```

9) AI 서비스 배포 (옵션)

```bash
gcloud run deploy shortube-ai \
  --image=$AI_IMAGE --platform=managed --region=$REGION \
  --vpc-connector=shortube-connector --vpc-egress=all-traffic \
  --set-env-vars=REDIS_HOST=$REDIS_HOST,REDIS_PORT=6379
```

10) 프론트엔드 배포(선택)
- Cloud Run에 정적 SPA를 올리거나, Firebase Hosting / Cloud Storage + CDN으로 호스팅 권장.

11) 검증

```bash
# Cloud Run URL 확인
gcloud run services describe shortube-backend --region=$REGION --format="value(status.url)"

# 로그 보기
gcloud logs read --project=$PROJECT_ID --limit=50
```

---

추가 고려사항
- Cloud Run에서 Memorystore에 접근하려면 반드시 **Serverless VPC Access** 커넥터를 만들고 `--vpc-egress=all-traffic`를 사용해 프라이빗 IP로 라우팅해야 합니다.
- Memorystore는 퍼블릭 IP를 제공하지 않습니다. 그래서 VM(Compute Engine)에 Redis를 직접 띄우는 대신 Memorystore가 운영·백업·보안 측면에서 우수합니다.
- 테스트 용도로는 Compute Engine에 Redis를 올릴 수 있지만, 운영 환경에선 관리형 Memorystore를 권장합니다.
- 대용량 작업(FFMPEG 등 CPU/메모리 집약적)은 Cloud Run 인스턴스 한계(요청 시간/메모리)에 유의하세요. 필요하면 Compute Engine, GKE, Cloud Run Jobs 또는 Cloud Tasks + Workloads(Compute Engine) 조합 고려.

원하시면 이 가이드를 `main/README.md` 맨 앞 또는 별도 파일로 분리해 더 상세한 운영 매뉴얼(모니터링, 백업, IAM 설정)을 추가해 드리겠습니다.

2. **Database 마이그레이션** (1-2일)
   - PostgreSQL 테이블 생성
   - 시드 데이터 작성

3. **mockWorks → worksApi 전환** (1일)
   - worksApi.js 추상화층 생성
   - worksApi.mock.js, worksApi.http.js 분리

4. **Admin 페이지** (2-3일)
   - 관리자 로그인
   - 결제 승인 UI

5. **AI 서버 연동** (3-5일)
   - Gemini 멀티모달 분석
   - FFMPEG 영상 합성

---

## 📝 참고사항

- **mockWorks 임시 저장소**: localStorage (`yourfactory.mockWorks.v1`)
- **작업 상태 흐름**: NEW → IN_PROGRESS (임시저장) → RENDERING (렌더링) → DONE (완료) / FAILED (오류)
- **권한 상태**: Active (사용 가능) / Pending (승인 대기) / Expired (기간 만료)
- **Cron 스케줄러**: 매일 자정(00:00) 권한 자동 만료 체크

---

**마지막 업데이트**: 2026년 5월 11일 | **상태**: 🟡 개발 중
