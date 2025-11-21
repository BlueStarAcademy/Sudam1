# 빠른 배포 가이드

이 문서는 Railway를 사용한 빠른 배포 방법을 설명합니다.

## 1단계: Railway 프로젝트 생성

1. [Railway](https://railway.app) 접속 및 로그인
2. "New Project" 클릭
3. "Deploy from GitHub repo" 선택 (또는 "Empty Project")

## 2단계: PostgreSQL 데이터베이스 추가

1. 프로젝트에서 "New" → "Database" → "Add PostgreSQL"
2. 생성된 PostgreSQL 서비스의 "Variables" 탭에서 `DATABASE_URL` 복사

## 3단계: Backend 서비스 배포

1. "New" → "GitHub Repo" 선택
2. 저장소 연결
3. **중요**: Root Directory는 `/` (프로젝트 루트)
4. Railway가 자동으로 `Dockerfile.backend` 감지
5. 환경 변수 설정:
   ```
   DATABASE_URL=<복사한 PostgreSQL URL>
   NODE_ENV=production
   PORT=4000
   FRONTEND_URL=https://your-backend.railway.app
   ```

## 4단계: Prisma 마이그레이션 실행

Backend 서비스가 배포된 후:

1. Backend 서비스 → "Deploy Logs"
2. "Run Command" 또는 터미널 접근
3. 다음 명령어 실행:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate:deploy
   ```

또는 Railway의 "Deploy" 탭에서 "Run Command" 사용:
```bash
npm run deploy:full
```

## 5단계: Frontend 배포

### 옵션 A: Railway에 배포

1. "New" → "GitHub Repo" 선택
2. 같은 저장소 선택
3. Root Directory: `/`
4. Dockerfile: `Dockerfile.frontend` 사용
5. 환경 변수:
   ```
   NODE_ENV=production
   ```

### 옵션 B: Vercel에 배포 (권장)

1. [Vercel](https://vercel.com) 접속
2. "New Project" → GitHub 저장소 선택
3. 빌드 설정:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. 환경 변수 (필요시):
   ```
   VITE_API_URL=https://your-backend.railway.app
   ```

## 6단계: 환경 변수 추가 설정

Backend 서비스의 "Variables" 탭에서 추가 설정:

### 이메일 서비스 (선택적)
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
EMAIL_FROM=noreply@yourdomain.com
```

### 카카오 로그인 (선택적)
```
KAKAO_CLIENT_ID=your-client-id
KAKAO_CLIENT_SECRET=your-secret
KAKAO_REDIRECT_URI=https://your-app.railway.app/auth/kakao/callback
```

## 7단계: 테스트

1. Backend Health Check:
   ```bash
   curl https://your-backend.railway.app/api/health
   ```

2. 브라우저에서 Frontend URL 접속
3. 회원가입/로그인 테스트
4. 실시간 기능 테스트

## 문제 해결

### 데이터베이스 연결 오류
- `DATABASE_URL` 형식 확인
- Supabase의 경우 SSL 모드 추가: `?sslmode=require`

### 빌드 실패
- Railway 로그 확인
- Node.js 버전 확인 (20.x 필요)
- 의존성 설치 오류 확인

### 배포 후 404 오류
- Frontend의 경우: `nginx.conf` 확인
- API 엔드포인트: CORS 설정 확인

## 추가 리소스

- 상세 가이드: `DEPLOYMENT.md`
- 환경 변수 설정: `ENV_SETUP.md`
- 체크리스트: `DEPLOY_CHECKLIST.md`

