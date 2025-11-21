# 502 Bad Gateway 오류 해결 가이드

## 현재 상황
- URL: `https://sudam.up.railway.app/api/health`
- 오류: "Application failed to respond" (502 Bad Gateway)

## 즉시 확인할 사항

### 1단계: 배포 로그 확인

1. Railway 프로젝트 대시보드로 이동
2. **"Sudam1"** 서비스 클릭
3. **"Deployments"** 탭 클릭
4. 최신 배포 클릭
5. **"View Logs"** 또는 **"Deploy Logs"** 확인

**확인할 내용:**
- 배포가 성공했는지 확인
- 에러 메시지가 있는지 확인
- "Server started on port 4000" 메시지가 있는지 확인

### 2단계: 일반적인 원인 확인

#### 원인 1: 배포 실패
**증상**: 로그에 빌드/시작 오류
**해결**:
- 로그의 에러 메시지 확인
- 환경 변수 확인
- Dockerfile 확인

#### 원인 2: 데이터베이스 연결 실패
**증상**: 로그에 "Can't reach database server" 또는 "P1001" 오류
**해결**:
- `DATABASE_URL` 환경 변수 확인
- PostgreSQL 서비스가 실행 중인지 확인
- 연결 문자열 형식 확인

#### 원인 3: 포트 설정 문제
**증상**: 로그에 포트 관련 오류
**해결**:
- `PORT=4000` 환경 변수 확인
- Railway는 자동으로 포트를 할당하므로 `PORT` 환경 변수는 선택적일 수 있음

#### 원인 4: Prisma 클라이언트 생성 실패
**증상**: 로그에 Prisma 관련 오류
**해결**:
- 배포 전에 `npm run prisma:generate` 실행 필요
- 또는 Dockerfile에서 자동 생성 확인

### 3단계: 환경 변수 재확인

**필수 환경 변수:**
```
DATABASE_URL=postgresql://...
NODE_ENV=production
PORT=4000
FRONTEND_URL=https://sudam.up.railway.app
```

### 4단계: 수동 재배포

1. **"Sudam1"** 서비스 → **"Settings"** 탭
2. **"Deploy"** 섹션에서 **"Redeploy"** 클릭
3. 배포 로그 확인

## 로그에서 확인할 메시지

### 정상적인 시작 메시지:
```
Prisma Client generated
Server started on port 4000
Database connected successfully
```

### 문제가 있는 경우:
```
Error: ...
Failed to connect to database
Cannot find module ...
```

## 빠른 해결 체크리스트

- [ ] Deploy Logs 확인
- [ ] 환경 변수 모두 설정되었는지 확인
- [ ] PostgreSQL 서비스가 실행 중인지 확인
- [ ] 배포가 성공했는지 확인
- [ ] 에러 메시지 확인 및 해결

