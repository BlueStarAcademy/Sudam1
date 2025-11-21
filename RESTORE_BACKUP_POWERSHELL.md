# PowerShell에서 백업 복원하기

PowerShell에서는 `<` 리다이렉션이 작동하지 않습니다. 다른 방법을 사용해야 합니다.

## 방법 1: Get-Content 사용 (권장)

```powershell
Get-Content C:\Users\muniz\Downloads\db_cluster-20-11-2025@15-12-54.backup.sql | railway run psql
```

## 방법 2: Railway CLI로 파일 전송 후 실행

```powershell
# Railway 환경에서 파일 읽기
railway run psql -f C:\Users\muniz\Downloads\db_cluster-20-11-2025@15-12-54.backup.sql
```

하지만 Railway 환경에서는 로컬 파일에 접근할 수 없으므로, 파일 내용을 전달해야 합니다.

## 방법 3: Public URL 사용 (가장 확실)

`.env` 파일의 `DATABASE_URL`을 Public URL로 변경한 후:

```powershell
Get-Content C:\Users\muniz\Downloads\db_cluster-20-11-2025@15-12-54.backup.sql | psql "postgresql://postgres:비밀번호@postgres-production-f9af.up.railway.app:5432/railway"
```

## 방법 4: Railway CLI로 파일 내용 전달

```powershell
# 파일 내용을 Railway 환경으로 전달
$content = Get-Content C:\Users\muniz\Downloads\db_cluster-20-11-2025@15-12-54.backup.sql -Raw
railway run psql -c $content
```

하지만 이 방법도 큰 파일에는 문제가 있을 수 있습니다.

## 가장 확실한 방법: Public URL 사용

1. `.env` 파일에서 `DATABASE_URL`을 Public URL로 변경
2. PowerShell에서 실행:

```powershell
Get-Content C:\Users\muniz\Downloads\db_cluster-20-11-2025@15-12-54.backup.sql | psql "postgresql://postgres:XfhEACpePdhsJdEGavgULnpMDDhmpKlR@postgres-production-f9af.up.railway.app:5432/railway"
```

**참고**: `psql`이 설치되어 있어야 합니다. 없다면 Railway CLI 방법을 사용하세요.

