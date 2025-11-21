# Supabase → Railway PostgreSQL 마이그레이션 가이드

## 개요
Supabase의 데이터를 Railway PostgreSQL로 마이그레이션하는 방법입니다.

## 전제 조건
- Supabase 프로젝트 접근 권한
- Railway 프로젝트 접근 권한
- 로컬에 PostgreSQL 클라이언트 도구 설치 (선택적)

## 마이그레이션 방법

### 방법 1: pg_dump 사용 (권장)

#### 1단계: Supabase에서 데이터 덤프

**옵션 A: Supabase 대시보드 사용**
1. Supabase 프로젝트 → **"Database"** → **"Backups"**
2. 수동 백업 생성 또는 기존 백업 다운로드

**옵션 B: pg_dump 명령어 사용 (로컬)**
```bash
# Supabase Connection String 가져오기
# Supabase → Settings → Database → Connection string

# 데이터 덤프 실행
pg_dump "postgresql://postgres:password@db.xxx.supabase.co:5432/postgres?sslmode=require" \
  --format=custom \
  --file=supabase_backup.dump
```

#### 2단계: Railway PostgreSQL에 데이터 복원

**옵션 A: Railway 대시보드 사용**
1. Railway → **"Postgres"** 서비스 → **"Database"** 탭
2. **"Connect"** 버튼 클릭
3. 연결 정보 확인

**옵션 B: pg_restore 명령어 사용**
```bash
# Railway PostgreSQL Connection String
# Railway → Postgres 서비스 → Variables → DATABASE_URL

# 데이터 복원
pg_restore \
  --host=postgres.railway.internal \
  --port=5432 \
  --username=postgres \
  --dbname=railway \
  --clean \
  --if-exists \
  supabase_backup.dump
```

### 방법 2: SQL 덤프 사용

#### 1단계: Supabase에서 SQL 덤프
```bash
pg_dump "postgresql://postgres:password@db.xxx.supabase.co:5432/postgres?sslmode=require" \
  --format=plain \
  --file=supabase_backup.sql
```

#### 2단계: Railway PostgreSQL에 SQL 실행
```bash
# Railway PostgreSQL에 연결
psql "postgresql://postgres:password@postgres.railway.internal:5432/railway" \
  < supabase_backup.sql
```

### 방법 3: Railway CLI 사용 (가장 쉬움)

#### 1단계: Railway CLI 설치
```bash
npm i -g @railway/cli
railway login
```

#### 2단계: Supabase에서 덤프
```bash
pg_dump "postgresql://postgres:password@db.xxx.supabase.co:5432/postgres?sslmode=require" \
  --format=plain \
  --file=supabase_backup.sql
```

#### 3단계: Railway에 복원
```bash
# Railway 프로젝트 연결
railway link

# PostgreSQL 서비스 선택
railway run psql < supabase_backup.sql
```

## 스키마만 마이그레이션하는 경우

데이터 없이 스키마만 마이그레이션하려면:

### 1단계: Supabase에서 스키마 덤프
```bash
pg_dump "postgresql://postgres:password@db.xxx.supabase.co:5432/postgres?sslmode=require" \
  --schema-only \
  --file=schema_only.sql
```

### 2단계: Railway에 스키마 적용
```bash
# Railway PostgreSQL에 연결하여 실행
psql "postgresql://postgres:password@postgres.railway.internal:5432/railway" \
  < schema_only.sql
```

### 또는 Prisma 마이그레이션 사용
이미 `supabase_migration.sql`이 있으므로:
1. Railway PostgreSQL의 SQL Editor 사용
2. `supabase_migration.sql` 파일 내용 복사하여 실행

## Railway PostgreSQL 접근 방법

### 방법 1: Railway 대시보드
1. **"Postgres"** 서비스 → **"Database"** 탭
2. **"Connect"** 버튼 클릭
3. 연결 정보 확인

### 방법 2: Variables에서 DATABASE_URL 확인
1. **"Postgres"** 서비스 → **"Variables"** 탭
2. `DATABASE_URL` 변수 확인
3. 이 URL을 사용하여 연결

**참고**: Railway 내부 네트워크에서는 `postgres.railway.internal` 사용
외부에서 접근하려면 Public URL 필요

## 마이그레이션 후 확인

### 1. 데이터 확인
```sql
-- Railway PostgreSQL에 연결
-- 테이블 목록 확인
\dt

-- 사용자 데이터 확인
SELECT COUNT(*) FROM "User";

-- 기타 테이블 확인
SELECT COUNT(*) FROM "UserCredential";
```

### 2. 애플리케이션 테스트
1. Railway → **"Sudam1"** 서비스
2. `DATABASE_URL`이 Railway PostgreSQL을 가리키는지 확인
3. "Apply changes" 클릭하여 재배포
4. `/api/health` 엔드포인트 테스트

## 주의사항

### 1. 데이터 손실 방지
- 마이그레이션 전 Supabase 백업 확인
- 테스트 환경에서 먼저 시도

### 2. 연결 문자열 차이
- Supabase: 외부 URL 사용
- Railway: 내부 네트워크 사용 (`postgres.railway.internal`)

### 3. SSL 설정
- Supabase: `?sslmode=require` 필요
- Railway: 내부 네트워크에서는 SSL 불필요

## Supabase 비용

✅ **Railway PostgreSQL 사용 시 Supabase 결제 불필요**
- Railway 플랜에 PostgreSQL 포함
- Supabase 무료 플랜도 계속 사용 가능 (다른 프로젝트용)
- 또는 Supabase 프로젝트 삭제 가능

## 빠른 마이그레이션 (스키마만)

새로 시작하므로 데이터가 중요하지 않다면:

1. Railway → **"Postgres"** 서비스 → **"Database"** 탭
2. **"SQL Editor"** 또는 **"Connect"** 사용
3. `supabase_migration.sql` 파일 내용 실행
4. 완료!

## 다음 단계

마이그레이션 완료 후:
1. ✅ Railway → **"Sudam1"** → **"Variables"** → `DATABASE_URL` 확인
2. ✅ "Apply 13 changes" 클릭
3. ✅ 배포 완료 후 `/api/health` 테스트
4. ✅ Supabase 프로젝트는 유지하거나 삭제 (선택)

