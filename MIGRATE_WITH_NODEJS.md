# Node.js로 데이터 마이그레이션 (무료 방법)

Supabase 백업 기능이 유료라면, Node.js 스크립트로 직접 마이그레이션할 수 있습니다.

## 준비사항

- Node.js 설치 (이미 설치되어 있음)
- Supabase Connection String
- Railway DATABASE_URL

## 단계별 가이드

### 1단계: 필요한 패키지 설치

프로젝트 루트에서:

```powershell
npm install pg dotenv
```

### 2단계: Supabase Connection String 확인

1. Supabase → **"Settings"** → **"Database"**
2. **"Connection string"** → **"URI"** 탭
3. 연결 문자열 복사
   - 형식: `postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres`

### 3단계: Railway DATABASE_URL 확인

1. Railway → **"Postgres"** 서비스 → **"Variables"** 탭
2. `DATABASE_URL` 변수 복사
   - 형식: `postgresql://postgres:password@postgres.railway.internal:5432/railway`

### 4단계: 환경 변수 설정

프로젝트 루트에 `.env` 파일 생성 (또는 기존 파일에 추가):

```env
# Supabase 연결 정보
SUPABASE_DATABASE_URL=postgresql://postgres:your-password@db.xxx.supabase.co:5432/postgres?sslmode=require

# Railway 연결 정보
DATABASE_URL=postgresql://postgres:password@postgres.railway.internal:5432/railway
```

**주의**: `.env` 파일은 `.gitignore`에 포함되어 있어야 합니다.

### 5단계: 마이그레이션 스크립트 실행

```powershell
node scripts/migrateFromSupabase.js
```

## 스크립트 동작 방식

1. Supabase에 연결
2. Railway PostgreSQL에 연결
3. 모든 테이블 목록 가져오기
4. 각 테이블의 데이터를 Supabase에서 읽기
5. Railway PostgreSQL에 삽입
6. 마이그레이션 결과 확인

## 문제 해결

### 연결 오류

**Supabase 연결 실패:**
- Connection String 형식 확인
- 비밀번호 확인
- SSL 모드 확인 (`?sslmode=require`)

**Railway 연결 실패:**
- Railway 내부 네트워크 사용: `postgres.railway.internal`
- 또는 Railway CLI 사용: `railway variables`로 DATABASE_URL 확인

### 메모리 부족

데이터가 많다면:
- 스크립트를 수정하여 배치 크기 조정
- 또는 테이블별로 나누어 실행

### 중복 데이터

스크립트는 `ON CONFLICT DO NOTHING`을 사용하여 중복을 방지합니다.
기존 데이터를 삭제하려면 스크립트의 주석 처리된 부분을 활성화하세요.

## 대안: Railway CLI 사용

Railway CLI가 설치되어 있다면:

```powershell
# Railway CLI 설치
npm install -g @railway/cli

# 로그인 및 프로젝트 연결
railway login
railway link

# PostgreSQL 서비스 선택
railway service select Postgres

# 환경 변수로 DATABASE_URL 자동 설정
railway variables
```

그 후 스크립트 실행:
```powershell
node scripts/migrateFromSupabase.js
```

## 다음 단계

마이그레이션 완료 후:

1. ✅ Railway → **"Sudam1"** → **"Variables"** → `DATABASE_URL` 확인
2. ✅ **"Apply 13 changes"** 클릭하여 재배포
3. ✅ 배포 완료 후 테스트

