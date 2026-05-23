# ☁️ 배포 가이드 — Cloud Run + Memorystore (Redis)

간단 설명: Cloud Run은 무상태(serverless) 서비스이므로 Redis는 외부(관리형 서비스 또는 VM)에 배치해야 합니다. 권장 옵션은 Google Cloud Memorystore(Managed Redis)입니다.

## 요약(간단 가이드)
- 권장 구성: Cloud Run(백엔드, AI 서비스) + Memorystore(Managed Redis) + Cloud SQL(또는 외부 Postgres)
- 핵심 단계:
  1. GCP 프로젝트 및 리전 설정
  2. 필요한 API 활성화 (Cloud Run, Memorystore, VPC Access, Artifact Registry, Cloud Build, Secret Manager)
  3. Artifact Registry 생성 및 컨테이너 빌드/업로드
  4. Serverless VPC Access 커넥터 생성
  5. Memorystore 인스턴스 생성(프라이빗 IP)
  6. Cloud Run 서비스 배포 시 VPC 커넥터 연결 및 Redis 호스트 환경변수 설정

### 요약 예시 커맨드 (빠른 실행)
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

## 전체(단계별 명령어) — 자세한 가이드

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
- 테스트 용도로는 Compute Engine에 Redis를 올릴 수 있지만, 운영 환경에선 관리형 Memorystore를 권장합니다。
- 대용량 작업(FFMPEG 등 CPU/메모리 집약적)은 Cloud Run 인스턴스 한계(요청 시간/메모리)에 유의하세요. 필요하면 Compute Engine, GKE, Cloud Run Jobs 또는 Cloud Tasks + Workloads(Compute Engine) 조합 고려。

원하시면 deploy 스크립트나 `Cloud Scheduler` 잡 생성 스크립트도 추가해 드리겠습니다. 스케줄러는 지금 건드리지 않도록 유지했습니다.
