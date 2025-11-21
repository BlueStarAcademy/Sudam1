# Railway URL 확인 가이드

## Backend 서비스 URL 확인 방법

### 방법 1: Settings 탭에서 확인

1. Railway 프로젝트 대시보드에서 **Backend 서비스** 클릭
2. 왼쪽 메뉴에서 **"Settings"** 탭 클릭
3. **"Networking"** 섹션 확인
4. **"Public Domain"** 또는 **"Generate Domain"** 버튼 클릭
5. 생성된 도메인 복사
   - 예시: `your-backend-production.up.railway.app`
   - 또는: `your-backend.railway.app`

### 방법 2: Deployments 탭에서 확인

1. Backend 서비스 → **"Deployments"** 탭
2. 최신 배포 클릭
3. 배포 상세 페이지에서 **"Public URL"** 확인

### 방법 3: 서비스 카드에서 확인

1. Railway 프로젝트 대시보드의 서비스 목록에서
2. Backend 서비스 카드 하단에 도메인 표시됨
3. 클릭하여 복사

## Frontend URL 확인 방법

### Railway에 Frontend 배포한 경우

Backend와 동일한 방법으로 확인:
1. Frontend 서비스 → **"Settings"** → **"Networking"**
2. Public Domain 확인

### Vercel에 Frontend 배포한 경우

1. Vercel 대시보드 → 프로젝트 선택
2. **"Deployments"** 탭
3. 최신 배포의 도메인 확인
4. 또는 **"Settings"** → **"Domains"**에서 확인

## 환경 변수 설정 시 URL 사용

### 초기 설정 (Frontend 배포 전)

```
FRONTEND_URL=https://your-backend-production.up.railway.app
```

Backend의 URL을 임시로 사용합니다.

### Frontend 배포 후

```
FRONTEND_URL=https://your-frontend-production.up.railway.app
```

또는 Vercel을 사용한 경우:

```
FRONTEND_URL=https://your-app.vercel.app
```

## 커스텀 도메인 설정 (선택적)

### Railway에서 커스텀 도메인 설정

1. 서비스 → **"Settings"** → **"Networking"**
2. **"Custom Domain"** 섹션에서 도메인 추가
3. DNS 설정 안내에 따라 레코드 추가

### Vercel에서 커스텀 도메인 설정

1. 프로젝트 → **"Settings"** → **"Domains"**
2. 도메인 추가
3. DNS 설정 안내에 따라 레코드 추가

## URL 확인 체크리스트

- [ ] Backend Public URL 확인
- [ ] `FRONTEND_URL` 환경 변수에 Backend URL 설정 (임시)
- [ ] Frontend 배포 완료
- [ ] Frontend Public URL 확인
- [ ] `FRONTEND_URL` 환경 변수를 Frontend URL로 업데이트
- [ ] 카카오 로그인 Redirect URI 업데이트 (Frontend URL 사용)

## 문제 해결

### URL이 보이지 않는 경우

1. 배포가 완료되었는지 확인
2. **"Settings"** → **"Networking"**에서 **"Generate Domain"** 클릭
3. Railway 플랜이 Public Domain을 지원하는지 확인

### HTTPS 연결 오류

- Railway는 자동으로 HTTPS를 제공합니다
- 커스텀 도메인 사용 시 SSL 인증서 자동 발급 (시간 소요 가능)

