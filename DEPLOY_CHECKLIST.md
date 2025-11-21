# 배포 체크리스트

배포 전에 다음 항목들을 확인하세요.

## 사전 준비

- [ ] Supabase 프로젝트 생성 및 데이터베이스 URL 확인
- [ ] Railway 계정 생성
- [ ] GitHub 저장소 준비 (또는 Railway에 직접 배포)
- [ ] 도메인 준비 (선택적)

## 환경 변수 설정

### 필수
- [ ] `DATABASE_URL` 설정 (Supabase PostgreSQL)
- [ ] `NODE_ENV=production` 설정
- [ ] `PORT=4000` 설정
- [ ] `FRONTEND_URL` 설정

### 이메일 서비스
- [ ] AWS SES 설정 (또는 SMTP)
  - [ ] `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` 설정
  - [ ] 또는 `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` 설정
- [ ] `EMAIL_FROM` 설정

### 카카오 로그인 (선택적)
- [ ] Kakao Developers에서 앱 생성
- [ ] `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET` 설정
- [ ] `KAKAO_REDIRECT_URI` 설정
- [ ] Redirect URI가 카카오 개발자 콘솔에 등록되어 있는지 확인

## 데이터베이스

- [ ] Supabase에서 PostgreSQL 데이터베이스 생성
- [ ] `supabase_migration.sql` 실행하여 스키마 생성
- [ ] 또는 Prisma 마이그레이션 실행: `npm run prisma:migrate:deploy`
- [ ] 데이터베이스 연결 테스트

## Backend 배포

- [ ] Railway에 Backend 서비스 생성
- [ ] GitHub 저장소 연결 (또는 직접 배포)
- [ ] Dockerfile 설정 확인 (`Dockerfile.backend`)
- [ ] 환경 변수 모두 설정
- [ ] 배포 실행 및 로그 확인
- [ ] `/api/health` 엔드포인트 테스트

## Frontend 배포

### 옵션 A: Railway
- [ ] Railway에 Frontend 서비스 생성
- [ ] `Dockerfile.frontend` 사용
- [ ] 빌드 명령어: `npm run build`
- [ ] 환경 변수 설정 (필요시)

### 옵션 B: Vercel/Netlify (권장)
- [ ] Vercel/Netlify 계정 생성
- [ ] GitHub 저장소 연결
- [ ] 빌드 설정 확인
- [ ] 환경 변수 설정 (API URL 등)

## 배포 후 확인

### 기능 테스트
- [ ] 회원가입 테스트
- [ ] 로그인 테스트
- [ ] 이메일 인증 테스트 (개발 환경에서는 콘솔 확인)
- [ ] 카카오 로그인 테스트 (설정한 경우)
- [ ] 실시간 기능 (WebSocket) 테스트
- [ ] 게임 플레이 테스트

### 성능 확인
- [ ] 응답 시간 확인
- [ ] 메모리 사용량 모니터링
- [ ] CPU 사용량 모니터링
- [ ] 데이터베이스 연결 풀 확인

### 보안 확인
- [ ] HTTPS 연결 확인
- [ ] 환경 변수 노출 여부 확인
- [ ] CORS 설정 확인
- [ ] 민감한 정보가 로그에 출력되지 않는지 확인

## 모니터링 설정

- [ ] Railway 대시보드에서 로그 확인
- [ ] 에러 알림 설정 (선택적)
- [ ] 가동 시간 모니터링 설정 (선택적)

## 문서화

- [ ] 배포 URL 기록
- [ ] 환경 변수 목록 문서화 (비밀번호 제외)
- [ ] 배포 절차 문서화

## 롤백 계획

- [ ] 이전 버전으로 롤백 방법 확인
- [ ] 데이터베이스 백업 방법 확인

## 다음 단계

배포 완료 후:
1. 사용자 피드백 수집
2. 성능 모니터링
3. 에러 로그 정기적 확인
4. 점진적 기능 개선

