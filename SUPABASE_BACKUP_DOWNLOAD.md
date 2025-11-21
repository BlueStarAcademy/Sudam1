# Supabase 백업 다운로드 및 Railway 복원

Pro 플랜으로 업그레이드되어 백업이 생성되었습니다!

## 백업 다운로드

### 1단계: 백업 다운로드

1. Supabase Backups 페이지에서
2. 원하는 백업 날짜 선택 (가장 최근 백업 권장: **20 Nov 2025**)
3. **"Download"** 버튼 클릭
4. 백업 파일 다운로드 (`.sql` 또는 `.dump` 형식)

**참고**: 
- "21 Nov 2025"는 아직 진행 중이므로 완료될 때까지 기다리거나
- "20 Nov 2025" 백업을 다운로드하세요

## Railway에 복원

### 방법 1: Railway CLI 사용 (권장)

```powershell
# Railway 프로젝트 연결 (이미 했다면 생략)
railway link

# PostgreSQL 서비스 선택
railway service

# 백업 파일 복원
railway run psql < supabase_backup.sql
```

### 방법 2: Public URL 사용

`.env` 파일의 `DATABASE_URL`을 Public URL로 변경한 후:

```powershell
# Public URL 사용하여 복원
psql "postgresql://postgres:비밀번호@postgres-production-f9af.up.railway.app:5432/railway" < supabase_backup.sql
```

### 방법 3: Railway 대시보드 SQL Editor 사용

1. Railway → **"Postgres"** 서비스 → **"Database"** 탭
2. **"Connect"** 또는 **"SQL Editor"** 클릭
3. 백업 파일 내용 복사하여 실행

## 전체 과정

1. ✅ Supabase에서 백업 다운로드 (20 Nov 2025 백업)
2. ✅ 백업 파일 저장 위치 확인
3. ✅ Railway CLI로 복원:
   ```powershell
   railway run psql < C:\Users\사용자명\Downloads\supabase_backup.sql
   ```

## 다음 단계

백업을 다운로드하셨나요? 다운로드한 파일 경로를 알려주시면 복원 명령어를 정확히 안내하겠습니다.

