# Supabase Pro 백업 사용 가이드

Supabase Pro 플랜으로 업그레이드하여 백업을 받는 방법입니다.

## Supabase Pro 업그레이드

### 1단계: Supabase Pro 플랜 구독

1. Supabase 대시보드 접속
2. **"Settings"** → **"Billing"** 클릭
3. **"Upgrade to Pro"** 또는 **"Change Plan"** 클릭
4. Pro 플랜 선택 및 결제

**참고**: Pro 플랜은 월 $25부터 시작합니다.

### 2단계: 백업 생성

1. Supabase → 왼쪽 사이드바 → **"Platform"** → **"Backups"** 클릭
2. **"Create backup"** 버튼 클릭
3. 백업 생성 완료 대기
4. 백업 파일 다운로드 (`.sql` 또는 `.dump` 형식)

## 백업 파일을 Railway에 복원

### 방법 1: Railway CLI 사용

```powershell
# Railway CLI로 백업 파일 복원
railway run psql < supabase_backup.sql
```

### 방법 2: Railway 대시보드 사용

1. Railway → **"Postgres"** 서비스 → **"Database"** 탭
2. **"Connect"** 또는 **"SQL Editor"** 사용
3. 백업 파일 내용 복사하여 실행

### 방법 3: 로컬에서 복원

Public URL을 사용하여:

```powershell
# Public URL 사용
psql "postgresql://postgres:비밀번호@postgres-production-f9af.up.railway.app:5432/railway" < supabase_backup.sql
```

## 비용 비교

### Supabase Pro
- 월 $25+ (백업 기능 포함)
- 자동 백업
- Point-in-time recovery

### Railway CLI 방법 (무료)
- Supabase 무료 플랜 유지
- Node.js 스크립트로 마이그레이션
- 약간의 설정 필요

## 추천

**일회성 마이그레이션**이라면:
- Railway CLI 방법이 더 경제적
- 하지만 설정이 복잡함

**정기적인 백업이 필요**하다면:
- Supabase Pro가 더 편리
- 자동 백업 및 복원 기능

## 다음 단계

Supabase Pro로 업그레이드하시겠어요? 아니면 Railway CLI 방법을 계속 시도해볼까요?

