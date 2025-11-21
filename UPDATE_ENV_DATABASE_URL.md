# .env 파일 DATABASE_URL 업데이트

현재 `.env` 파일의 `DATABASE_URL`이 `postgres.railway.internal`을 사용하고 있어서 로컬에서 접근할 수 없습니다.

## 수정 방법

### 1단계: Railway에서 비밀번호 확인

1. Railway → **"Postgres"** 서비스 → **"Variables"** 탭
2. `DATABASE_URL` 변수 확인
3. 비밀번호 부분 복사

예시:
```
postgresql://postgres:XfhEACpePdhsJdEGavgULnpMDDhmpKlR@postgres.railway.internal:5432/railway
```
비밀번호: `XfhEACpePdhsJdEGavgULnpMDDhmpKlR`

### 2단계: .env 파일 수정

`.env` 파일을 열어서 `DATABASE_URL` 줄을 찾아 수정:

**변경 전:**
```env
DATABASE_URL="postgresql://postgres:XfhEACpePdhsJdEGavgULnpMDDhmpKlR@postgres.railway.internal:5432/railway"
```

**변경 후:**
```env
DATABASE_URL=postgresql://postgres:XfhEACpePdhsJdEGavgULnpMDDhmpKlR@postgres-production-f9af.up.railway.app:5432/railway
```

**변경 사항:**
- `postgres.railway.internal` → `postgres-production-f9af.up.railway.app`
- 큰따옴표 제거 (선택적이지만 권장)

### 3단계: 파일 저장 후 다시 실행

```powershell
node scripts/migrateFromSupabase.js
```

## 전체 형식

```env
# Supabase 연결 정보
SUPABASE_DATABASE_URL=postgresql://postgres.xqepeecuuquoamcvomsv:gudans10dkfk@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres

# Railway PostgreSQL (Public URL 사용)
DATABASE_URL=postgresql://postgres:비밀번호@postgres-production-f9af.up.railway.app:5432/railway
```

**중요**: `비밀번호` 부분을 Railway Postgres Variables에서 확인한 실제 비밀번호로 교체하세요.

