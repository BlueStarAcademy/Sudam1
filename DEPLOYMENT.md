# 배포 가이드

이 문서는 SUDAMR 앱을 Railway에 배포하는 방법을 설명합니다.

## 배포 전 준비사항

### 1. 환경 변수 설정

다음 환경 변수들을 Railway 프로젝트에 설정해야 합니다:

#### 필수 환경 변수

```bash
# 데이터베이스 (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres

# Node.js 환경
NODE_ENV=production
PORT=4000

# 프론트엔드 URL (이메일 링크용)
FRONTEND_URL=https://your-app.railway.app
```

#### 선택적 환경 변수 (기능별)

**이메일 서비스 (AWS SES)**
```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
EMAIL_FROM=noreply@yourdomain.com
```

**SMTP (개발/대안)**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**카카오 로그인**
```bash
KAKAO_CLIENT_ID=your-kakao-client-id
KAKAO_CLIENT_SECRET=your-kakao-client-secret
KAKAO_REDIRECT_URI=https://your-app.railway.app/auth/kakao/callback
```

**KataGo 설정 (선택적)**
```bash
KATAGO_PATH=/katago/katago
KATAGO_MODEL_PATH=/katago/model.bin.gz
KATAGO_HOME_PATH=/katago-home
KATAGO_NUM_ANALYSIS_THREADS=4
KATAGO_NUM_SEARCH_THREADS=8
KATAGO_MAX_VISITS=500
KATAGO_NN_MAX_BATCH_SIZE=8
```

## Railway 배포 단계

### 1. Railway 계정 생성 및 프로젝트 생성

1. [Railway](https://railway.app)에 가입/로그인
2. "New Project" 클릭
3. "Deploy from GitHub repo" 선택 (또는 "Empty Project"로 시작)

### 2. PostgreSQL 데이터베이스 추가

1. Railway 프로젝트에서 "New" → "Database" → "Add PostgreSQL" 선택
2. 생성된 PostgreSQL 서비스의 "Variables" 탭에서 `DATABASE_URL` 복사
3. 이 URL을 Backend 서비스의 환경 변수로 설정

### 3. Backend 서비스 배포

1. "New" → "GitHub Repo" 선택 (또는 "Empty Service")
2. 저장소 연결 후:
   - **Root Directory**: `/` (프로젝트 루트)
   - **Build Command**: (자동 감지)
   - **Start Command**: `npm run start-server`
3. Dockerfile 사용 시:
   - `Dockerfile.backend`를 사용하도록 설정
4. 환경 변수 설정:
   - 위의 "필수 환경 변수" 모두 추가
   - 필요한 선택적 환경 변수 추가

### 4. Frontend 서비스 배포

**옵션 A: Railway에 배포**
1. "New" → "GitHub Repo" 선택
2. Root Directory: `/`
3. Build Command: `npm run build`
4. Dockerfile: `Dockerfile.frontend` 사용
5. 환경 변수:
   ```bash
   NODE_ENV=production
   VITE_API_URL=https://your-backend.railway.app
   ```

**옵션 B: Vercel/Netlify 배포 (권장)**
- 더 나은 CDN 성능
- 무료 플랜 제공
- 자동 HTTPS

### 5. Prisma 마이그레이션 실행

Backend 서비스가 배포된 후, Railway의 "Deploy Logs"에서 다음 명령어를 실행하거나, 별도의 마이그레이션 서비스를 생성:

```bash
npm run prisma:generate
npm run prisma:migrate:deploy
```

또는 Railway의 "Deploy Logs"에서 수동 실행:
1. Backend 서비스 → "Deploy Logs"
2. "Run Command" 또는 터미널 접근
3. 위 명령어 실행

## 배포 후 확인사항

### 1. 데이터베이스 연결 확인
- Backend 로그에서 데이터베이스 연결 성공 메시지 확인
- Prisma 마이그레이션이 성공적으로 완료되었는지 확인

### 2. API 엔드포인트 테스트
```bash
curl https://your-backend.railway.app/api/health
```

### 3. WebSocket 연결 테스트
- 브라우저 개발자 도구에서 WebSocket 연결 확인
- 실시간 기능이 정상 작동하는지 확인

### 4. 환경 변수 확인
- 모든 필수 환경 변수가 설정되었는지 확인
- 민감한 정보가 로그에 노출되지 않았는지 확인

## 문제 해결

### 데이터베이스 연결 오류
- `DATABASE_URL` 형식 확인
- Supabase 방화벽 설정 확인
- SSL 연결 필요 시 `?sslmode=require` 추가

### 빌드 실패
- `package.json`의 의존성 확인
- Node.js 버전 확인 (20.x 권장)
- Dockerfile의 빌드 단계 확인

### 메모리 부족
- Railway 플랜 업그레이드 고려
- KataGo 설정 조정 (스레드 수 감소)
- 불필요한 서비스 제거

## 비용 최적화

### Railway 무료 플랜
- $5 크레딧/월 제공
- 소규모 배포에 충분

### 권장 구성 (저비용)
1. **Backend**: Railway ($5/월)
2. **Frontend**: Vercel (무료)
3. **Database**: Supabase (무료 플랜)
4. **Email**: AWS SES (무료 티어: 62,000 이메일/월)

### 예상 월 비용
- Railway: $5-10 (트래픽에 따라)
- Supabase: 무료 (500MB DB, 2GB 대역폭)
- AWS SES: 무료 (62,000 이메일/월)
- **총계**: 약 $5-10/월

## 모니터링

### Railway 대시보드
- CPU/메모리 사용량 모니터링
- 로그 확인
- 배포 상태 확인

### 추가 모니터링 도구 (선택적)
- Sentry (에러 추적)
- Logtail (로그 집계)
- Uptime Robot (가동 시간 모니터링)

## 다음 단계

1. ✅ 환경 변수 설정
2. ✅ Railway 프로젝트 생성
3. ✅ 데이터베이스 연결
4. ✅ Backend 배포
5. ✅ Frontend 배포
6. ✅ Prisma 마이그레이션 실행
7. ✅ 기능 테스트
8. ✅ 모니터링 설정

