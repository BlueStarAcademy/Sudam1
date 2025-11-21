# Railway 연결 문제 해결

`postgres.railway.internal`은 Railway 내부 네트워크에서만 작동합니다. 로컬 컴퓨터에서는 접근할 수 없습니다.

## 해결 방법: Railway CLI 사용

Railway CLI를 사용하여 Railway 환경에서 스크립트를 실행하면 내부 네트워크에 접근할 수 있습니다.

### 1단계: Railway CLI 설치 (아직 안 했다면)

```powershell
npm install -g @railway/cli
```

### 2단계: Railway에 로그인

```powershell
railway login
```

### 3단계: 프로젝트 연결

```powershell
cd C:\project\SUDAMR
railway link
```

프롬프트에서:
- 프로젝트: **"capable-harmony"** 선택
- 환경: **"production"** 선택

### 4단계: PostgreSQL 서비스 선택

```powershell
railway service select Postgres
```

### 5단계: Railway 환경에서 스크립트 실행

```powershell
railway run node scripts/migrateFromSupabase.js
```

이렇게 하면 Railway 내부 네트워크에서 실행되므로 `postgres.railway.internal`에 접근할 수 있습니다.

## 대안: Railway PostgreSQL Public URL 사용

Railway PostgreSQL에 Public URL이 있다면:

1. Railway → **"Postgres"** 서비스 → **"Settings"** → **"Networking"**
2. **"Generate Domain"** 클릭하여 Public URL 생성
3. `.env` 파일의 `DATABASE_URL`을 Public URL로 변경

예시:
```env
DATABASE_URL=postgresql://postgres:password@postgres-production.up.railway.app:5432/railway
```

## 전체 과정 요약

```powershell
# 1. Railway CLI 설치
npm install -g @railway/cli

# 2. 로그인
railway login

# 3. 프로젝트 연결
railway link

# 4. PostgreSQL 서비스 선택
railway service select Postgres

# 5. 마이그레이션 실행
railway run node scripts/migrateFromSupabase.js
```

## 확인

Railway CLI를 사용하면:
- ✅ Railway 내부 네트워크 접근 가능
- ✅ `postgres.railway.internal` 호스트 사용 가능
- ✅ 환경 변수 자동 설정

