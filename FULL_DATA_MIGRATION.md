# 전체 데이터 마이그레이션 가이드 (Supabase → Railway)

기존 유저 정보와 모든 게임 데이터를 Railway PostgreSQL로 마이그레이션하는 방법입니다.

## 준비사항

1. **로컬에 PostgreSQL 클라이언트 도구 설치**
   - Windows: [PostgreSQL 다운로드](https://www.postgresql.org/download/windows/)
   - 또는 `psql` 명령어 사용 가능한 환경

2. **Supabase 접근 권한**
   - Connection String 필요

3. **Railway 접근 권한**
   - Postgres 서비스 Variables 접근

## 마이그레이션 단계

### 1단계: Supabase에서 전체 데이터 덤프

#### 방법 A: pg_dump 사용 (권장)

1. **Supabase Connection String 확인**
   - Supabase 프로젝트 → Settings → Database
   - Connection string 복사
   - 형식: `postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres`

2. **로컬 터미널에서 덤프 실행**

```bash
# 전체 데이터베이스 덤프 (스키마 + 데이터)
pg_dump "postgresql://postgres:your-password@db.xxx.supabase.co:5432/postgres?sslmode=require" \
  --format=custom \
  --file=supabase_full_backup.dump \
  --verbose

# 또는 SQL 형식으로 (더 호환성 좋음)
pg_dump "postgresql://postgres:your-password@db.xxx.supabase.co:5432/postgres?sslmode=require" \
  --format=plain \
  --file=supabase_full_backup.sql \
  --verbose
```

**덤프 옵션 설명:**
- `--format=custom`: 바이너리 형식 (더 빠르고 효율적)
- `--format=plain`: SQL 텍스트 형식 (호환성 좋음)
- `--verbose`: 진행 상황 표시

#### 방법 B: Supabase 대시보드 사용

1. Supabase 프로젝트 → **"Database"** → **"Backups"**
2. 수동 백업 생성
3. 백업 파일 다운로드

### 2단계: Railway PostgreSQL 연결 정보 확인

1. Railway → **"Postgres"** 서비스 → **"Variables"** 탭
2. `DATABASE_URL` 변수 확인
3. 형식: `postgresql://postgres:password@postgres.railway.internal:5432/railway`

**참고**: Railway 내부 네트워크에서는 `postgres.railway.internal` 사용
외부에서 접근하려면 Public URL이 필요할 수 있습니다.

### 3단계: Railway PostgreSQL에 데이터 복원

#### 방법 A: pg_restore 사용 (custom 형식)

```bash
# Railway DATABASE_URL 사용
pg_restore \
  --host=postgres.railway.internal \
  --port=5432 \
  --username=postgres \
  --dbname=railway \
  --clean \
  --if-exists \
  --verbose \
  supabase_full_backup.dump
```

#### 방법 B: psql 사용 (SQL 형식)

```bash
# Railway DATABASE_URL로 연결하여 SQL 실행
psql "postgresql://postgres:password@postgres.railway.internal:5432/railway" \
  < supabase_full_backup.sql
```

#### 방법 C: Railway CLI 사용 (가장 쉬움)

```bash
# Railway CLI 설치 (아직 안 했다면)
npm i -g @railway/cli

# Railway 프로젝트 연결
railway link

# PostgreSQL 서비스 선택
railway service

# SQL 파일 실행
railway run psql < supabase_full_backup.sql
```

### 4단계: 스키마 마이그레이션 확인

덤프에 스키마가 포함되어 있지만, 추가 마이그레이션이 필요할 수 있습니다:

1. Railway → **"Postgres"** 서비스 → **"Database"** 탭
2. SQL Editor가 있다면 `supabase_migration.sql` 실행
3. 또는 로컬에서:
   ```bash
   psql "postgresql://postgres:password@postgres.railway.internal:5432/railway" \
     < supabase_migration.sql
   ```

## 단계별 상세 가이드

### Windows에서 실행하는 경우

#### 1. PostgreSQL 설치 확인
```powershell
# PowerShell에서 확인
psql --version
```

설치되어 있지 않다면:
- [PostgreSQL Windows 설치](https://www.postgresql.org/download/windows/)
- 또는 [pgAdmin](https://www.pgadmin.org/download/) 사용

#### 2. Supabase 덤프
```powershell
# PowerShell에서 실행
$env:PGPASSWORD="your-supabase-password"
pg_dump -h db.xxx.supabase.co -U postgres -d postgres -F c -f supabase_full_backup.dump
```

#### 3. Railway에 복원
```powershell
# Railway DATABASE_URL에서 비밀번호 추출 후
$env:PGPASSWORD="railway-password"
pg_restore -h postgres.railway.internal -U postgres -d railway -c -v supabase_full_backup.dump
```

### Mac/Linux에서 실행하는 경우

```bash
# Supabase 덤프
pg_dump "postgresql://postgres:password@db.xxx.supabase.co:5432/postgres?sslmode=require" \
  --format=custom \
  --file=supabase_full_backup.dump

# Railway에 복원
pg_restore \
  --host=postgres.railway.internal \
  --username=postgres \
  --dbname=railway \
  --clean \
  --verbose \
  supabase_full_backup.dump
```

## 마이그레이션 후 확인

### 1. 데이터 확인

Railway PostgreSQL에 연결하여 확인:

```sql
-- 테이블 목록 확인
\dt

-- 사용자 수 확인
SELECT COUNT(*) FROM "User";

-- 인벤토리 아이템 수 확인
SELECT COUNT(*) FROM "UserInventory";

-- 게임 세션 확인
SELECT COUNT(*) FROM "LiveGame";

-- 기타 주요 테이블 확인
SELECT 
  'User' as table_name, COUNT(*) as count FROM "User"
UNION ALL
SELECT 'UserInventory', COUNT(*) FROM "UserInventory"
UNION ALL
SELECT 'UserCredential', COUNT(*) FROM "UserCredential"
UNION ALL
SELECT 'LiveGame', COUNT(*) FROM "LiveGame";
```

### 2. 애플리케이션 테스트

1. Railway → **"Sudam1"** 서비스
2. `DATABASE_URL`이 Railway PostgreSQL을 가리키는지 확인
3. **"Apply 13 changes"** 클릭하여 재배포
4. 배포 완료 후:
   - `/api/health` 엔드포인트 테스트
   - 로그인 테스트
   - 기존 유저 데이터로 로그인 가능한지 확인

## 문제 해결

### 연결 오류

**Railway 내부 네트워크 접근 불가 시:**
- Railway → **"Postgres"** → **"Settings"** → **"Networking"**
- Public URL 생성 (필요한 경우)

### 권한 오류

```sql
-- Railway PostgreSQL에서 권한 확인
GRANT ALL PRIVILEGES ON DATABASE railway TO postgres;
```

### 데이터 타입 불일치

덤프/복원 중 타입 오류가 발생하면:
- SQL 형식으로 덤프하여 수동 수정
- 또는 스키마만 먼저 마이그레이션 후 데이터만 복원

## 안전한 마이그레이션 체크리스트

- [ ] Supabase에서 전체 백업 완료
- [ ] 백업 파일 크기 확인 (예상 데이터량과 일치하는지)
- [ ] Railway PostgreSQL 연결 테스트
- [ ] 스키마 마이그레이션 실행 (`supabase_migration.sql`)
- [ ] 데이터 복원 실행
- [ ] 데이터 무결성 확인 (레코드 수, 주요 테이블 확인)
- [ ] 애플리케이션 테스트
- [ ] 기존 유저 로그인 테스트
- [ ] 게임 데이터 정상 작동 확인

## 롤백 계획

문제 발생 시:
1. Supabase 데이터는 그대로 유지됨
2. Railway PostgreSQL 데이터 삭제 후 재시도
3. 또는 Supabase로 다시 전환 가능

## 다음 단계

마이그레이션 완료 후:
1. ✅ Railway → **"Sudam1"** → **"Variables"** → `DATABASE_URL` 확인
2. ✅ **"Apply 13 changes"** 클릭
3. ✅ 배포 완료 후 테스트
4. ✅ 모든 기능 정상 작동 확인
5. ✅ Supabase 프로젝트는 백업용으로 유지하거나 삭제

