# Railway 앱 주소 찾기 가이드

## 방법 1: 서비스 카드에서 확인 (가장 쉬움)

1. Railway 프로젝트 대시보드로 이동
   - 상단 메뉴에서 **"Architecture"** 클릭
   - 또는 프로젝트 이름 클릭

2. 서비스 목록 확인
   - Backend 서비스 카드 찾기
   - 카드 하단에 **도메인 주소**가 표시됨
   - 예: `your-service-production.up.railway.app`
   - 클릭하면 복사됨

## 방법 2: 서비스 Settings에서 확인

1. Backend 서비스 카드 클릭
2. 왼쪽 메뉴에서 **"Settings"** 탭 클릭
3. **"Networking"** 섹션 찾기
4. 다음 중 하나 확인:
   - **"Public Domain"**: 이미 생성된 도메인 표시
   - **"Generate Domain"** 버튼: 클릭하여 도메인 생성

## 방법 3: Deployments 탭에서 확인

1. Backend 서비스 클릭
2. **"Deployments"** 탭 클릭
3. 최신 배포 클릭
4. 배포 상세 페이지에서 **"Public URL"** 확인

## 방법 4: 서비스가 없는 경우

만약 아직 서비스를 생성하지 않았다면:

1. 프로젝트 대시보드에서 **"New"** 버튼 클릭
2. **"GitHub Repo"** 선택
3. 연결된 저장소 선택
4. 서비스가 생성되면 위의 방법으로 URL 확인

## URL이 보이지 않는 경우

### 도메인 생성하기

1. Backend 서비스 → **"Settings"** → **"Networking"**
2. **"Generate Domain"** 버튼 클릭
3. 생성된 도메인 복사

### Railway 플랜 확인

- 무료 플랜도 Public Domain을 제공합니다
- 도메인 생성에 문제가 있으면 Railway 지원팀에 문의

## 확인된 URL 사용하기

URL을 찾았다면:

1. **환경 변수 설정**:
   ```
   FRONTEND_URL=https://your-service-production.up.railway.app
   ```

2. **브라우저에서 테스트**:
   ```
   https://your-service-production.up.railway.app/api/health
   ```

3. **응답 확인**:
   ```json
   {
     "status": "ok",
     "timestamp": "...",
     "uptime": ...
   }
   ```

## 문제 해결

### "Generate Domain" 버튼이 없는 경우
- 서비스가 아직 배포되지 않았을 수 있습니다
- 배포가 완료될 때까지 기다리기

### 도메인이 생성되지 않는 경우
- Railway 대시보드 새로고침
- 다른 브라우저에서 시도
- Railway 지원팀에 문의

