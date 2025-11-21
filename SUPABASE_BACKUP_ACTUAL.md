# Supabase 실제 백업 방법

Supabase Backups 페이지에서 보이는 내용에 맞춘 실제 방법입니다.

## 현재 상황

Supabase Backups 페이지에서:
- "Scheduled backups" 탭이 선택되어 있음
- "Free Plan does not include project backups" 메시지 표시
- "Upgrade to the Pro Plan for up to 7 days of scheduled backups" 안내

## 실제 백업 방법

### 방법 1: Pro 플랜 업그레이드 후 자동 백업 사용

1. **"Enable add on"** 버튼 클릭 (또는 Pro 플랜 업그레이드)
2. Pro 플랜으로 업그레이드
3. 자동 백업이 활성화되면:
   - "Scheduled backups" 탭에서 백업 목록 확인
   - 백업 다운로드 가능

### 방법 2: Point in time 복원 사용 (Pro 플랜 필요)

1. "Point in time" 탭 클릭
2. 특정 시점 선택
3. 해당 시점의 데이터베이스 상태로 복원

### 방법 3: 수동 백업 (무료 방법)

Supabase에서는 직접적인 "Create backup" 버튼이 없을 수 있습니다. 대신:

1. **pg_dump 사용** (이미 시도한 방법)
2. **SQL Editor에서 데이터 추출**
3. **Supabase CLI 사용**

## 실제로 할 수 있는 것

### Pro 플랜 없이 (현재 상태)

1. **SQL Editor 사용**:
   - Supabase → **"SQL Editor"** 클릭
   - 각 테이블별로 데이터 확인 및 추출

2. **pg_dump 사용** (이미 시도 중):
   - 로컬에서 Connection String 사용
   - 데이터 덤프 생성

3. **Railway CLI 방법 계속 시도**:
   - `.env` 파일의 `DATABASE_URL`을 Public URL로 변경
   - 마이그레이션 스크립트 실행

### Pro 플랜으로 업그레이드 시

1. **자동 백업 활성화**:
   - "Enable add on" 클릭
   - Pro 플랜 구독
   - 자동 백업이 시작되면 백업 다운로드 가능

2. **Point in time 복원**:
   - 특정 시점의 데이터베이스 상태로 복원 가능

## 추천 방법

**현재 상황에서 가장 현실적인 방법:**

1. **Railway CLI 방법 계속 시도**:
   - `.env` 파일의 `DATABASE_URL`을 Public URL로 변경
   - `postgres.railway.internal` → `postgres-production-f9af.up.railway.app`

2. **또는 Pro 플랜 업그레이드**:
   - "Enable add on" 클릭
   - Pro 플랜 구독
   - 자동 백업 사용

## 다음 단계

어떤 방법을 선택하시겠어요?

1. **Railway CLI 방법 계속** (무료, `.env` 파일 수정 필요)
2. **Pro 플랜 업그레이드** (유료, 자동 백업 사용)

