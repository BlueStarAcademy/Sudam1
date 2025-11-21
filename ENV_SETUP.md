# 환경 변수 설정 가이드

이 문서는 배포를 위한 환경 변수 설정 방법을 설명합니다.

## Railway 환경 변수 설정 방법

1. Railway 프로젝트 대시보드 접속
2. 배포할 서비스 선택
3. "Variables" 탭 클릭
4. "New Variable" 버튼으로 각 변수 추가

## 필수 환경 변수

### 데이터베이스
```bash
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
```
- Supabase PostgreSQL 연결 문자열
- SSL 연결이 필요한 경우: `?sslmode=require` 추가

### 기본 설정
```bash
NODE_ENV=production
PORT=4000
FRONTEND_URL=https://your-app.railway.app
```

## 선택적 환경 변수

### 이메일 서비스 (AWS SES)

**방법 1: AWS SES 사용 (권장)**
```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
EMAIL_FROM=noreply@yourdomain.com
```

**방법 2: SMTP 사용 (개발/대안)**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**참고**: Gmail 사용 시:
1. Google 계정 → 보안 → 2단계 인증 활성화
2. 앱 비밀번호 생성
3. 생성된 비밀번호를 `SMTP_PASS`에 사용

### 카카오 로그인

1. [Kakao Developers](https://developers.kakao.com) 접속
2. 애플리케이션 생성
3. 플랫폼 설정 → Web 플랫폼 추가
4. Redirect URI 등록: `https://your-app.railway.app/auth/kakao/callback`
5. 환경 변수 설정:
```bash
KAKAO_CLIENT_ID=your-kakao-client-id
KAKAO_CLIENT_SECRET=your-kakao-client-secret
KAKAO_REDIRECT_URI=https://your-app.railway.app/auth/kakao/callback
```

### KataGo 설정 (선택적)

KataGo는 GPU가 필요하므로 Railway에서는 제한적입니다. CPU 모드로 실행하거나 별도 서버 필요.

```bash
KATAGO_PATH=/katago/katago
KATAGO_MODEL_PATH=/katago/model.bin.gz
KATAGO_HOME_PATH=/katago-home
KATAGO_NUM_ANALYSIS_THREADS=4
KATAGO_NUM_SEARCH_THREADS=8
KATAGO_MAX_VISITS=500
KATAGO_NN_MAX_BATCH_SIZE=8
```

## 환경 변수 확인

배포 후 다음 명령어로 환경 변수가 제대로 설정되었는지 확인:

```bash
# Railway Deploy Logs에서 확인
echo $DATABASE_URL
echo $NODE_ENV
```

또는 Backend 서비스의 로그에서 확인:
- 데이터베이스 연결 성공 메시지
- 환경 변수 관련 오류 메시지

## 보안 주의사항

1. **절대 커밋하지 마세요**: `.env` 파일은 `.gitignore`에 포함되어 있습니다
2. **Railway Secrets 사용**: 민감한 정보는 Railway의 Variables 탭에서만 설정
3. **로깅 주의**: 환경 변수가 로그에 출력되지 않도록 주의
4. **정기적 로테이션**: API 키와 비밀번호는 정기적으로 변경

## 문제 해결

### DATABASE_URL 연결 오류
- 연결 문자열 형식 확인
- Supabase 방화벽 설정 확인
- SSL 모드 필요 시 `?sslmode=require` 추가

### 이메일 전송 실패
- AWS SES의 경우: 이메일 주소 인증 확인
- SMTP의 경우: 포트 및 인증 정보 확인
- 개발 환경에서는 콘솔에 인증 코드 출력됨

### 카카오 로그인 오류
- Redirect URI가 정확히 일치하는지 확인
- 카카오 개발자 콘솔에서 앱 상태 확인

