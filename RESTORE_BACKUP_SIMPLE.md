# 백업 복원 간단 가이드

## PowerShell에서 백업 복원하기

### 방법 1: Get-Content 사용 (가장 간단)

```powershell
Get-Content C:\Users\muniz\Downloads\db_cluster-20-11-2025@15-12-54.backup.sql | railway run psql
```

### 방법 2: .env 파일 수정 후 psql 사용

1. `.env` 파일에서 `DATABASE_URL`을 Public URL로 변경:
   ```env
   DATABASE_URL=postgresql://postgres:XfhEACpePdhsJdEGavgULnpMDDhmpKlR@postgres-production-f9af.up.railway.app:5432/railway
   ```

2. PowerShell에서 실행:
   ```powershell
   Get-Content C:\Users\muniz\Downloads\db_cluster-20-11-2025@15-12-54.backup.sql | psql $env:DATABASE_URL
   ```

**참고**: `psql`이 설치되어 있어야 합니다.

### 방법 3: Node.js 스크립트로 복원

백업 파일을 읽어서 Railway에 복원하는 스크립트를 만들 수 있습니다.

## 추천: 방법 1

Railway CLI를 사용하는 방법이 가장 확실합니다:

```powershell
Get-Content C:\Users\muniz\Downloads\db_cluster-20-11-2025@15-12-54.backup.sql | railway run psql
```

이 명령어를 실행해보세요!

