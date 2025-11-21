# Supabase에서 데이터 덤프하는 방법

## 방법 1: Connection String 사용 (가장 권장)

Supabase 대시보드에서 Connection String을 가져와서 로컬에서 pg_dump를 실행합니다.

### 1단계: Connection String 확인

1. 현재 페이지에서 **"Connect"** 버튼 클릭
2. 또는 왼쪽 사이드바 → **"Database"** → **"Settings"** (현재 페이지)
3. **"Connection string"** 섹션 찾기
4. **"URI"** 또는 **"Connection pooling"** 탭에서 연결 문자열 복사
   - 형식: `postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres`

### 2단계: 비밀번호 확인

1. 현재 페이지의 **"Database password"** 섹션
2. 비밀번호를 알고 있다면 사용
3. 모른다면 **"Reset database password"** 클릭하여 새 비밀번호 설정

### 3단계: 로컬에서 pg_dump 실행

**Windows PowerShell:**
```powershell
# 비밀번호를 환경 변수로 설정
$env:PGPASSWORD="your-supabase-password"

# 덤프 실행
pg_dump -h db.xxx.supabase.co -U postgres -d postgres -F p -f supabase_full_backup.sql -v
```

**Mac/Linux:**
```bash
pg_dump "postgresql://postgres:your-password@db.xxx.supabase.co:5432/postgres?sslmode=require" \
  --format=plain \
  --file=supabase_full_backup.sql \
  --verbose
```

## 방법 2: Supabase Backups 기능 사용

### 1단계: Backups 페이지로 이동

1. 왼쪽 사이드바 → **"Platform"** → **"Backups"** 클릭
2. 또는 상단 URL에서 `/database/backups`로 이동

### 2단계: 백업 생성/다운로드

1. **"Create backup"** 또는 **"Download backup"** 버튼 확인
2. 백업 파일 다운로드
3. 다운로드한 파일을 사용하여 Railway에 복원

**참고**: Supabase의 백업 기능은 프로젝트 플랜에 따라 다를 수 있습니다.

## 방법 3: SQL Editor에서 직접 추출 (소규모 데이터)

데이터가 많지 않다면 SQL Editor에서 직접 추출할 수 있습니다.

### 1단계: SQL Editor 열기

1. 왼쪽 사이드바 → **"SQL Editor"** 클릭
2. 또는 상단 메뉴에서 **"SQL Editor"** 선택

### 2단계: 데이터 추출 쿼리 실행

```sql
-- 각 테이블의 데이터를 COPY 명령어로 추출
-- 또는 SELECT 쿼리로 데이터 확인 후 수동 복사
```

**단점**: 대용량 데이터에는 비효율적

## 방법 4: Supabase CLI 사용

### 1단계: Supabase CLI 설치

```bash
npm install -g supabase
```

### 2단계: 로그인 및 프로젝트 연결

```bash
supabase login
supabase link --project-ref your-project-ref
```

### 3단계: 데이터베이스 덤프

```bash
supabase db dump -f supabase_backup.sql
```

## 가장 쉬운 방법: Connection String + pg_dump

### 전체 과정

1. **Connection String 확인**
   - 현재 페이지에서 **"Connect"** 버튼 클릭
   - 또는 왼쪽 사이드바 → **"Database"** → **"Settings"**
   - **"Connection string"** → **"URI"** 탭에서 복사

2. **비밀번호 확인/설정**
   - 현재 페이지의 **"Database password"** 섹션
   - 비밀번호를 모른다면 **"Reset database password"** 클릭

3. **로컬 터미널에서 실행**
   ```bash
   # Connection String에서 비밀번호 부분 [YOUR-PASSWORD]를 실제 비밀번호로 교체
   pg_dump "postgresql://postgres:실제비밀번호@db.xxx.supabase.co:5432/postgres?sslmode=require" \
     --format=plain \
     --file=supabase_full_backup.sql \
     --verbose
   ```

## PostgreSQL 도구가 없는 경우

### Windows에 PostgreSQL 설치

1. [PostgreSQL 다운로드](https://www.postgresql.org/download/windows/)
2. 설치 시 "Command Line Tools" 포함 확인
3. 설치 후 PowerShell에서 `pg_dump --version` 확인

### 또는 pgAdmin 사용

1. [pgAdmin 다운로드](https://www.pgadmin.org/download/)
2. Supabase 연결 설정
3. GUI에서 백업 실행

## 다음 단계

덤프가 완료되면:
1. `supabase_full_backup.sql` 파일 확인
2. Railway PostgreSQL에 복원 (다음 단계)

