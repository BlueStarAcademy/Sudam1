# 데이터베이스 옵션 가이드

## 현재 상황
- 기존: Supabase PostgreSQL 사용 중
- 신규: Railway PostgreSQL 생성됨

## 두 가지 옵션

### 옵션 1: Supabase 계속 사용 (권장 - 기존 데이터 유지)

**장점:**
- ✅ 기존 데이터 유지 (마이그레이션 불필요)
- ✅ Supabase의 무료 플랜 활용
- ✅ 이미 마이그레이션 완료된 스키마 사용
- ✅ Supabase 대시보드에서 데이터 관리 가능

**단점:**
- ❌ 외부 서비스 의존 (Supabase)
- ❌ 네트워크 지연 가능성 (미미함)

**설정 방법:**
1. Supabase 프로젝트 → **"Settings"** → **"Database"**
2. **"Connection string"** 또는 **"Connection pooling"** URL 복사
   - 예: `postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres`
3. Railway의 **"Sudam1"** 서비스 → **"Variables"** 탭
4. `DATABASE_URL` 환경 변수에 Supabase URL 설정

**참고**: Supabase의 경우 SSL이 필요하므로:
```
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres?sslmode=require
```

### 옵션 2: Railway PostgreSQL로 완전 이전

**장점:**
- ✅ 모든 서비스가 Railway 내부에 통합
- ✅ 네트워크 지연 최소화
- ✅ 단일 플랫폼 관리

**단점:**
- ❌ 기존 데이터 마이그레이션 필요
- ❌ Supabase에서 Railway로 데이터 복사 필요
- ❌ Railway PostgreSQL은 무료 플랜이 제한적일 수 있음

**마이그레이션 방법:**
1. Supabase에서 데이터 덤프
2. Railway PostgreSQL에 데이터 임포트
3. 스키마 마이그레이션 실행

## 추천: 옵션 1 (Supabase 계속 사용)

**이유:**
1. 기존 데이터 유지
2. 이미 마이그레이션 완료된 스키마 사용
3. Supabase 무료 플랜 활용
4. 추가 작업 최소화

## 설정 단계 (Supabase 사용)

### 1. Supabase에서 Connection String 가져오기

1. Supabase 프로젝트 대시보드 접속
2. **"Settings"** → **"Database"** 클릭
3. **"Connection string"** 섹션에서 **"URI"** 복사
   - 또는 **"Connection pooling"** 사용 (권장)
4. 비밀번호 부분 `[YOUR-PASSWORD]`를 실제 비밀번호로 교체

### 2. Railway에 환경 변수 설정

1. Railway → **"Sudam1"** 서비스 → **"Variables"** 탭
2. `DATABASE_URL` 환경 변수 추가/수정:
   ```
   DATABASE_URL=postgresql://postgres:your-password@db.xxx.supabase.co:5432/postgres?sslmode=require
   ```

### 3. 재배포

환경 변수 저장 후 자동 재배포됩니다.

## 데이터 마이그레이션이 필요한 경우 (옵션 2)

만약 Railway PostgreSQL로 완전히 이전하고 싶다면:

1. Supabase에서 데이터 백업
2. Railway PostgreSQL에 복원
3. 스키마 마이그레이션 실행 (`supabase_migration.sql` 또는 Prisma 마이그레이션)

## 결론

**현재 상황에서는 옵션 1 (Supabase 계속 사용)을 권장합니다.**

- 기존 데이터 유지
- 추가 작업 최소화
- 안정적인 서비스

