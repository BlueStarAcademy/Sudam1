# 개발 PC 설정 가이드

## 필수 설정 사항

### 1. 환경 변수 파일 설정

프로젝트 루트에 `.env` 파일이 이미 존재하지만, 다음 항목들을 확인/설정해야 합니다:

#### 필수 환경 변수

```env
# 데이터베이스 연결 (Prisma)
DATABASE_URL="postgresql://postgres.xqepeecuuquoamcvomsv:gudans10dkfk@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=1"

# 서버 포트 (기본값: 4000)
PORT=4000

# Node 환경
NODE_ENV=development
```

#### 선택적 환경 변수 (기능별)

**KataGo AI 설정** (바둑 AI 분석 기능 사용 시):
```env
# KataGo 실행 파일 경로 (기본값: 프로젝트 루트/katago/katago.exe)
KATAGO_PATH=C:/path/to/katago.exe

# KataGo 모델 파일 경로
KATAGO_MODEL_PATH=C:/path/to/kata1-b28c512nbt-s9853922560-d5031756885.bin.gz

# KataGo 홈 디렉토리 경로
KATAGO_HOME_PATH=C:/project/SUDAM/server/katago_home

# KataGo 성능 설정 (선택사항)
KATAGO_NUM_ANALYSIS_THREADS=4
KATAGO_NUM_SEARCH_THREADS=8
KATAGO_MAX_VISITS=1000
KATAGO_NN_MAX_BATCH_SIZE=16
```

**Google Gemini API** (AI 기능 사용 시):
```env
# .env.local 파일에 설정 (README 참조)
GEMINI_API_KEY=your_gemini_api_key_here
```

**소셜 로그인** (OAuth 사용 시):
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:4000/auth/google/callback

KAKAO_CLIENT_ID=your_kakao_client_id
KAKAO_CLIENT_SECRET=your_kakao_client_secret
KAKAO_REDIRECT_URI=http://localhost:4000/auth/kakao/callback
```

**Supabase** (이미 설정되어 있음):
```env
SUPABASE_URL=https://xqepeecuuquoamcvomsv.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. 데이터베이스 마이그레이션

Prisma를 사용하므로 마이그레이션을 실행해야 합니다:

```bash
# Prisma 클라이언트 생성 (이미 완료됨)
npm run prisma:generate

# 데이터베이스 마이그레이션 적용
npm run prisma:migrate:deploy
```

### 3. KataGo 설정 (선택사항)

바둑 AI 분석 기능을 사용하려면:

1. KataGo 실행 파일과 모델 파일을 다운로드
2. 프로젝트 루트에 `katago` 폴더 생성
3. `.env` 파일에 경로 설정 (또는 기본 경로 사용)

### 4. PowerShell 실행 정책 설정

PowerShell에서 npm 명령어를 사용하려면:

```powershell
# 현재 세션에만 적용
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process

# 영구적으로 적용 (관리자 권한 필요)
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 현재 설정 상태

✅ **완료된 항목:**
- Node.js 의존성 설치 완료
- Prisma 클라이언트 생성 완료
- DATABASE_URL 설정 완료
- 서버 실행 확인 완료

⚠️ **확인 필요:**
- GEMINI_API_KEY 설정 (`.env.local` 파일 생성 필요)
- KataGo 파일 다운로드 및 설정 (AI 분석 기능 사용 시)
- 소셜 로그인 키 설정 (OAuth 기능 사용 시)

## 빠른 시작

1. `.env` 파일 확인 (이미 존재함)
2. `.env.local` 파일 생성 (Gemini API 사용 시):
   ```bash
   # .env.local 파일 생성
   echo "GEMINI_API_KEY=your_key_here" > .env.local
   ```
3. 서버 실행:
   ```bash
   npm start
   ```
4. 브라우저에서 접속:
   - 클라이언트: http://localhost:5173
   - 서버 API: http://localhost:4000

## 문제 해결

### 포트 충돌 시
```powershell
# 포트 사용 프로세스 확인
netstat -ano | findstr ":4000"

# 모든 Node.js 프로세스 종료
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Prisma 클라이언트 재생성
```bash
npm run prisma:generate
```

### 데이터베이스 연결 오류 시
- `.env` 파일의 `DATABASE_URL` 확인
- Supabase 연결 정보 확인
- 네트워크 방화벽 설정 확인


