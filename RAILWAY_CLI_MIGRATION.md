# Railway CLI를 사용한 데이터 마이그레이션

PostgreSQL 설치 없이 Railway CLI만으로 데이터를 마이그레이션하는 방법입니다.

## 준비사항

1. Node.js 설치 (이미 설치되어 있을 가능성 높음)
2. Supabase 접근 권한
3. Railway 접근 권한

## 단계별 가이드

### 1단계: Railway CLI 설치

PowerShell에서 실행:

```powershell
npm install -g @railway/cli
```

설치 확인:
```powershell
railway --version
```

### 2단계: Railway에 로그인

```powershell
railway login
```

브라우저가 열리면 Railway 계정으로 로그인하세요.

### 3단계: Supabase에서 데이터 추출

#### 방법 A: Supabase Backups 사용 (가장 쉬움)

1. Supabase 대시보드 접속
2. 왼쪽 사이드바 → **"Platform"** → **"Backups"** 클릭
3. **"Create backup"** 버튼 클릭 (또는 기존 백업 다운로드)
4. 백업 파일 다운로드 (`.sql` 또는 `.dump` 형식)

#### 방법 B: SQL Editor에서 직접 추출

1. Supabase → **"SQL Editor"** 클릭
2. 다음 쿼리로 각 테이블 데이터 확인:
   ```sql
   -- 전체 테이블 목록
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```

3. 각 테이블별로 데이터 추출 (데이터가 많지 않은 경우)

### 4단계: Railway 프로젝트 연결

```powershell
# 프로젝트 디렉토리로 이동 (선택적)
cd C:\project\SUDAMR

# Railway 프로젝트 연결
railway link
```

프롬프트가 나타나면:
1. 프로젝트 선택: **"capable-harmony"** 선택
2. 환경 선택: **"production"** 선택

### 5단계: PostgreSQL 서비스 선택

```powershell
# 사용 가능한 서비스 확인
railway service

# PostgreSQL 서비스 선택 (보통 "Postgres" 또는 "postgres")
railway service select Postgres
```

### 6단계: 데이터 복원

#### Supabase Backups 파일이 있는 경우:

```powershell
# SQL 파일 복원
railway run psql < supabase_backup.sql

# 또는 덤프 파일인 경우
railway run pg_restore -d railway < supabase_backup.dump
```

#### SQL 파일을 직접 생성한 경우:

1. `supabase_data.sql` 파일 생성 (텍스트 에디터 사용)
2. 파일에 SQL INSERT 문 작성 또는 Supabase에서 추출한 데이터 포함
3. 복원:
   ```powershell
   railway run psql < supabase_data.sql
   ```

### 7단계: 스키마 마이그레이션 실행

기존 `supabase_migration.sql` 파일이 있다면:

```powershell
# 프로젝트 루트에서 실행
railway run psql < supabase_migration.sql
```

### 8단계: 데이터 확인

Railway CLI로 데이터 확인:

```powershell
# PostgreSQL에 연결하여 쿼리 실행
railway run psql -c "SELECT COUNT(*) FROM \"User\";"
railway run psql -c "SELECT COUNT(*) FROM \"UserInventory\";"
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

# 5. Supabase 백업 파일 복원
railway run psql < supabase_backup.sql

# 6. 스키마 마이그레이션 (필요시)
railway run psql < supabase_migration.sql

# 7. 데이터 확인
railway run psql -c "SELECT COUNT(*) FROM \"User\";"
```

## 문제 해결

### Railway CLI가 설치되지 않는 경우

```powershell
# Node.js 버전 확인
node --version

# npm 업데이트
npm install -g npm@latest

# 다시 설치
npm install -g @railway/cli
```

### 로그인 오류

```powershell
# 로그아웃 후 다시 로그인
railway logout
railway login
```

### 서비스 선택 오류

```powershell
# 사용 가능한 서비스 목록 확인
railway service list

# 특정 서비스 선택
railway service select <서비스이름>
```

## 다음 단계

마이그레이션 완료 후:

1. ✅ Railway → **"Sudam1"** 서비스 → **"Variables"** 탭
2. ✅ `DATABASE_URL`이 Railway PostgreSQL을 가리키는지 확인
3. ✅ **"Apply 13 changes"** 클릭하여 재배포
4. ✅ 배포 완료 후 `/api/health` 테스트

