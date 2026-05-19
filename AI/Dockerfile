# AI/Dockerfile
FROM python:3.10-slim

# 시스템 의존성 및 FFMPEG 설치
RUN apt-get update && apt-get install -y \
	ffmpeg \
	libsm6 \
	libxext6 \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 파이썬 라이브러리 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 소스 코드 복사
COPY . .

# FastAPI 서버 실행
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]