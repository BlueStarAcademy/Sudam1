# Railway 프론트엔드 배포 오류 해결

## 문제
```
Cannot GET /
```

이 오류는 프론트엔드가 제대로 배포되지 않았거나, 빌드가 실패했음을 의미합니다.

## 해결 방법

### 1. Railway에서 프론트엔드 서비스 확인

1. **Railway 대시보드 접속**
   - 프로젝트 → Frontend 서비스 선택 (또는 새로 생성)

2. **Settings 탭 확인**
   - **Root Directory**: `/` (프로젝트 루트)
   - **Dockerfile Path**: `Dockerfile.frontend` (명시적으로 설정)
   - **Build Command**: 비워두기 (Dockerfile에서 처리)
   - **Start Command**: 비워두기 (Dockerfile에서 처리)

3. **Deploy Logs 확인**
   - 빌드가 성공했는지 확인
   - 다음 메시지들이 보여야 합니다:
     ```
     Building frontend...
     npm run build
     dist/ 폴더 생성 확인
     nginx 시작
     ```

### 2. 빌드 실패 확인

Deploy Logs에서 다음 오류 확인:
- `npm run build` 실패
- `dist/` 폴더가 생성되지 않음
- nginx 설정 파일 오류

### 3. nginx.conf 확인

Railway에서 프론트엔드와 백엔드를 별도 서비스로 배포하는 경우, `nginx.conf`의 프록시 설정을 수정해야 합니다:

**현재 설정 (내부 네트워크):**
```nginx
set $backend_url "http://backend:4000";
```

**Railway에서 별도 서비스인 경우:**
- Railway의 내부 네트워크를 사용하거나
- 환경 변수로 백엔드 URL 설정

### 4. 환경 변수 설정

Frontend 서비스의 Variables 탭에서:

```bash
NODE_ENV=production
```

백엔드 URL이 필요한 경우 (프론트엔드 코드에서 사용):
```bash
VITE_API_URL=https://your-backend.railway.app
```

### 5. 대안: Vercel에 배포 (권장)

Railway에서 프론트엔드 배포가 계속 실패하면 Vercel을 사용하는 것이 더 간단합니다:

1. [Vercel](https://vercel.com) 접속
2. "New Project" → GitHub 저장소 선택
3. 빌드 설정:
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. 환경 변수 (필요시):
   ```
   VITE_API_URL=https://your-backend.railway.app
   ```
5. 배포

### 6. Railway 배포 재시도

1. **서비스 삭제 후 재생성**
   - Frontend 서비스 삭제
   - "New" → "GitHub Repo" → 같은 저장소 선택
   - Dockerfile Path: `Dockerfile.frontend` 명시

2. **또는 Deploy Logs에서 수동 빌드 확인**
   - "Run Command" 사용
   - 다음 명령어 실행:
     ```bash
     npm run build
     ls -la dist/
     ```

## 확인 사항

배포 후 다음을 확인하세요:

1. **빌드 성공 확인**
   - Deploy Logs에서 `npm run build` 성공 메시지
   - `dist/` 폴더 생성 확인

2. **nginx 시작 확인**
   - Deploy Logs에서 nginx 시작 메시지
   - 포트 80 리스닝 확인

3. **정적 파일 서빙 확인**
   - 브라우저에서 `https://sudam.up.railway.app` 접속
   - `https://sudam.up.railway.app/index.html` 접속 시도

4. **API 프록시 확인**
   - `https://sudam.up.railway.app/api/health` 접속
   - 백엔드 응답 확인

## 문제 해결

### 빌드 실패
- Node.js 버전 확인 (20.x 필요)
- 의존성 설치 오류 확인
- TypeScript 오류 확인

### nginx 오류
- `nginx.conf` 파일이 제대로 복사되었는지 확인
- nginx 로그 확인

### 404 오류
- `dist/index.html`이 존재하는지 확인
- nginx의 `try_files` 설정 확인

