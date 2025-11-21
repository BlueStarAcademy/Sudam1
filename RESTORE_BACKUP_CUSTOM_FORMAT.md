# .backup.gz 파일 복원 (Custom Format)

`.backup.gz` 파일은 PostgreSQL의 **custom format** 백업입니다. 일반 SQL 파일이 아니므로 `pg_restore`를 사용해야 합니다.

## 해결 방법

### 방법 1: Supabase에서 SQL 형식으로 다시 다운로드 (가장 쉬움)

1. Supabase → **"Backups"** → **"Scheduled backups"**
2. **"20 Nov 2025"** 백업의 **"Download"** 버튼 클릭
3. 다운로드 옵션에서 **"SQL"** 또는 **"Plain text"** 형식 선택
4. SQL 파일 다운로드
5. Node.js 스크립트로 복원:
   ```powershell
   node scripts/restoreBackup.js "C:\Users\muniz\Downloads\백업파일.sql"
   ```

### 방법 2: Railway CLI로 pg_restore 사용

```powershell
# 압축 해제된 .backup 파일이 있다면
Get-Content C:\Users\muniz\Downloads\db_cluster-20-11-2025@15-12-54.backup.gz -Raw | railway run pg_restore -d railway -c -v
```

하지만 이 방법도 작동하지 않을 수 있습니다 (파일 크기 문제).

### 방법 3: 로컬에서 압축 해제 후 처리

1. **7-Zip** 또는 **WinRAR**로 `.gz` 파일 압축 해제
2. `.backup` 파일 생성
3. Railway CLI로 복원 시도

### 방법 4: Supabase SQL Editor에서 직접 추출

데이터가 많지 않다면:
1. Supabase → **"SQL Editor"**
2. 각 테이블별로 데이터 확인
3. 수동으로 Railway에 복원

## 추천: 방법 1

**Supabase에서 SQL 형식으로 다시 다운로드하는 것이 가장 확실합니다.**

Supabase Backups 페이지에서:
- **"Download"** 버튼 클릭
- 다운로드 옵션에서 **"SQL"** 또는 **"Plain text"** 형식 선택
- SQL 파일 다운로드 후 Node.js 스크립트로 복원

