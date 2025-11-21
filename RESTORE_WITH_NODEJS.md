# Node.js로 백업 복원하기

`psql`이 설치되어 있지 않아도 Node.js 스크립트로 백업을 복원할 수 있습니다.

## 사용 방법

### 1단계: .env 파일에 DATABASE_URL 추가

`.env` 파일에 Railway PostgreSQL Public URL 추가:

```env
DATABASE_URL=postgresql://postgres:XfhEACpePdhsJdEGavgULnpMDDhmpKlR@postgres-production-f9af.up.railway.app:5432/railway
```

**중요**: `XfhEACpePdhsJdEGavgULnpMDDhmpKlR` 부분을 Railway Postgres Variables에서 확인한 실제 비밀번호로 교체하세요.

### 2단계: 백업 파일 경로 확인

백업 파일이 다운로드된 위치 확인:
- 기본 경로: `C:\Users\muniz\Downloads\db_cluster-20-11-2025@15-12-54.backup.sql`
- 다른 위치에 있다면 전체 경로 확인

### 3단계: 스크립트 실행

**기본 경로 사용:**
```powershell
node scripts/restoreBackup.js
```

**다른 경로 사용:**
```powershell
node scripts/restoreBackup.js "C:\경로\백업파일.sql"
```

## 스크립트 동작

1. 백업 파일 읽기
2. Railway PostgreSQL에 연결
3. SQL 쿼리 실행
4. 진행 상황 표시
5. 복원 완료 후 데이터 확인

## 문제 해결

### 파일을 찾을 수 없는 경우

```powershell
# Downloads 폴더의 모든 .sql 파일 찾기
Get-ChildItem C:\Users\muniz\Downloads\*.sql
```

### DATABASE_URL 오류

`.env` 파일의 `DATABASE_URL`이 Public URL을 사용하는지 확인:
- ✅ `postgres-production-f9af.up.railway.app` (Public URL)
- ❌ `postgres.railway.internal` (내부 네트워크, 로컬에서 접근 불가)

