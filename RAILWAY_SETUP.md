# Railway 배포 단계별 가이드

## 현재 상태
✅ Railway 계정 생성 완료
✅ Git 저장소 연결 완료

## 다음 단계

### 1단계: PostgreSQL 데이터베이스 추가

1. Railway 프로젝트 대시보드에서 **"New"** 버튼 클릭
2. **"Database"** 선택
3. **"Add PostgreSQL"** 선택
4. PostgreSQL 서비스가 생성되면:
   - 서비스 이름 클릭
   - **"Variables"** 탭 클릭
   - `DATABASE_URL` 변수를 찾아서 **전체 URL 복사**
   - 예시: `postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway`

### 2단계: Backend 서비스 생성 및 설정

1. Railway 프로젝트에서 **"New"** → **"GitHub Repo"** 선택
2. 연결된 저장소 선택
3. 서비스가 생성되면:
   - **"Settings"** 탭 클릭
   - **"Root Directory"**: 비워두기 (프로젝트 루트 사용)
   - **"Dockerfile Path"**: `Dockerfile.backend` (또는 자동 감지)
   - **"Start Command"**: `npm run start-server` (자동 설정됨)

### 3단계: Backend 환경 변수 설정

Backend 서비스의 **"Variables"** 탭에서 다음 변수 추가:

#### 필수 변수
```
DATABASE_URL=<1단계에서 복사한 PostgreSQL URL>
NODE_ENV=production
PORT=4000
FRONTEND_URL=<아래에서 확인한 Backend Public URL>
```

**FRONTEND_URL 확인 방법:**
1. Backend 서비스 클릭
2. **"Settings"** 탭 클릭
3. **"Networking"** 섹션에서 **"Public Domain"** 또는 **"Generate Domain"** 버튼 확인
4. 생성된 도메인을 복사 (예: `your-backend-production.up.railway.app`)
5. 이 URL을 `FRONTEND_URL`에 설정

**참고**: 
- Frontend를 배포하기 전에는 Backend의 URL을 사용합니다
- Frontend를 배포한 후에는 Frontend의 실제 URL로 업데이트하세요

#### 선택적 변수 (나중에 추가 가능)

**이메일 서비스 (개발 환경에서는 생략 가능)**
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
EMAIL_FROM=noreply@yourdomain.com
```

**카카오 로그인 (나중에 설정)**
```
KAKAO_CLIENT_ID=your-client-id
KAKAO_CLIENT_SECRET=your-secret
KAKAO_REDIRECT_URI=https://your-backend.railway.app/auth/kakao/callback
```

### 4단계: Backend 배포 및 확인

1. 환경 변수를 모두 설정한 후, Railway가 자동으로 배포를 시작합니다
2. **"Deployments"** 탭에서 배포 진행 상황 확인
3. 배포가 완료되면:
   - **"Deploy Logs"** 탭에서 로그 확인
   - 다음 메시지들이 보여야 합니다:
     - "Prisma Client generated"
     - "Server started on port 4000"
     - 데이터베이스 연결 성공 메시지

### 5단계: Prisma 마이그레이션 실행

배포가 완료된 후:

1. Backend 서비스 → **"Deployments"** 탭
2. 최신 배포 클릭
3. **"View Logs"** 또는 **"Run Command"** 클릭
4. 다음 명령어 실행:

```bash
npm run prisma:generate
npm run prisma:migrate:deploy
```

또는 Railway의 **"Deploy Logs"**에서 터미널 접근 후 실행

**대안**: Railway의 **"Settings"** → **"Deploy"** 탭에서 **"Run Command"** 사용

### 6단계: 데이터베이스 마이그레이션 확인

Supabase SQL Editor에서 `supabase_migration.sql`을 실행했는지 확인:

- ✅ 실행 완료: 다음 단계로 진행
- ❌ 미실행: Supabase SQL Editor에서 `supabase_migration.sql` 실행

### 7단계: Backend 서비스 테스트

1. Backend 서비스의 **"Settings"** 탭에서 **Public URL** 확인
2. 브라우저에서 다음 URL 접속:
   ```
   https://your-backend.railway.app/api/health
   ```
3. 다음 응답이 나와야 합니다:
   ```json
   {
     "status": "ok",
     "timestamp": "...",
     "uptime": ...
   }
   ```

### 8단계: Frontend 서비스 배포 (선택적)

#### 옵션 A: Railway에 배포

1. **"New"** → **"GitHub Repo"** 선택
2. 같은 저장소 선택
3. **"Settings"** → **"Dockerfile Path"**: `Dockerfile.frontend`
4. 환경 변수:
   ```
   NODE_ENV=production
   ```

#### 옵션 B: Vercel에 배포 (권장)

1. [Vercel](https://vercel.com) 접속
2. **"New Project"** → GitHub 저장소 선택
3. 빌드 설정:
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. 환경 변수 (필요시):
   ```
   VITE_API_URL=https://your-backend.railway.app
   ```

## 문제 해결

### 배포 실패
- **로그 확인**: "Deploy Logs" 탭에서 에러 메시지 확인
- **환경 변수 확인**: 모든 필수 변수가 설정되었는지 확인
- **Dockerfile 확인**: `Dockerfile.backend`가 올바른지 확인

### 데이터베이스 연결 오류
- `DATABASE_URL` 형식 확인
- PostgreSQL 서비스가 실행 중인지 확인
- Railway의 내부 네트워크를 통해 자동 연결됨

### Prisma 마이그레이션 오류
- `DATABASE_URL`이 올바른지 확인
- Supabase에서 마이그레이션을 먼저 실행했는지 확인
- 로그에서 구체적인 오류 메시지 확인

## 다음 단계

Backend가 정상 작동하면:
1. ✅ Frontend 배포
2. ✅ 기능 테스트
3. ✅ 이메일 서비스 설정 (선택적)
4. ✅ 카카오 로그인 설정 (선택적)

