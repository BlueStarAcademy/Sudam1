# .backup.gz 파일 복원 방법

`.backup.gz` 파일은 PostgreSQL의 custom format 백업입니다. `pg_restore`를 사용해야 합니다.

## 해결 방법

### 방법 1: Railway CLI 사용 (권장)

Railway 환경에서 `pg_restore`를 사용:

```powershell
# 압축 해제 (선택적, Railway CLI가 자동으로 처리할 수도 있음)
# 또는 직접 Railway에서 실행

# Railway CLI로 복원
railway run pg_restore -d railway -c -v C:\Users\muniz\Downloads\db_cluster-20-11-2025@15-12-54.backup.gz
```

하지만 Railway CLI는 로컬 파일에 직접 접근할 수 없을 수 있습니다.

### 방법 2: Supabase에서 SQL 형식으로 다시 다운로드

1. Supabase → **"Backups"** → **"Scheduled backups"**
2. 같은 백업의 **"Download"** 버튼 클릭
3. 다운로드 옵션에서 **"SQL"** 형식 선택 (있는 경우)
4. SQL 파일 다운로드

### 방법 3: 로컬에서 압축 해제 후 Railway에 업로드

1. `.gz` 파일 압축 해제 (7-Zip, WinRAR 등 사용)
2. `.backup` 파일 생성
3. Railway CLI로 복원

### 방법 4: Node.js 스크립트로 custom format 처리

custom format은 바이너리 형식이므로 Node.js로 직접 처리하기 어렵습니다.

## 가장 현실적인 방법

**Supabase에서 SQL 형식으로 다시 다운로드하거나, Railway CLI를 사용하여 Railway 환경에서 직접 복원하는 것이 좋습니다.**

## Railway CLI로 복원 시도

먼저 시도해볼 수 있는 방법:

```powershell
# Railway 환경에서 pg_restore 실행
railway run pg_restore -d railway -c -v < C:\Users\muniz\Downloads\db_cluster-20-11-2025@15-12-54.backup.gz
```

하지만 PowerShell의 `<` 리다이렉션이 작동하지 않으므로:

```powershell
Get-Content C:\Users\muniz\Downloads\db_cluster-20-11-2025@15-12-54.backup.gz -Raw | railway run pg_restore -d railway -c -v
```

또는 파일을 Railway에 업로드하는 방법을 사용해야 할 수 있습니다.

