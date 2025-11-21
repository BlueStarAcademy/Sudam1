# Railway PostgreSQL Public URL 사용 방법

Public URL: `postgres-production-f9af.up.railway.app`

## 연결 문자열 구성

### 1단계: Railway에서 전체 DATABASE_URL 확인

1. Railway → **"Postgres"** 서비스 → **"Variables"** 탭
2. `DATABASE_URL` 변수 확인
3. 전체 연결 문자열 복사

형식 예시:
```
postgresql://postgres:비밀번호@postgres.railway.internal:5432/railway
```

### 2단계: Public URL로 변환

Railway의 `DATABASE_URL`에서:
- 비밀번호 부분 추출
- `postgres.railway.internal`을 `postgres-production-f9af.up.railway.app`로 교체
- 포트는 `5432` 사용

최종 형식:
```
postgresql://postgres:비밀번호@postgres-production-f9af.up.railway.app:5432/railway
```

## .env 파일에 추가

`.env` 파일에 다음 추가:

```env
# Railway PostgreSQL (Public URL 사용)
DATABASE_URL=postgresql://postgres:비밀번호@postgres-production-f9af.up.railway.app:5432/railway
```

**중요**: `비밀번호` 부분을 Railway Postgres 서비스의 Variables에서 확인한 실제 비밀번호로 교체하세요.

## 빠른 방법

Railway Postgres 서비스의 Variables에서 `DATABASE_URL`을 복사한 후:
- `postgres.railway.internal` → `postgres-production-f9af.up.railway.app`로 교체
- `.env` 파일에 추가

