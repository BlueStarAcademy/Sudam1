# .env 파일 DATABASE_URL 수정

## 현재 문제

```env
DATABASE_URL=postgresql://postgres:@db.xqepeecuuquoamcvomsv.supabase.co:5432/postgres
```

**문제**: `postgres:@` 부분에 비밀번호가 없습니다!

## 수정 방법

### 방법 1: SUPABASE_DATABASE_URL에서 비밀번호 사용

`SUPABASE_DATABASE_URL`에 비밀번호가 있으므로, 그것을 사용하세요:

```env
# Supabase 연결 정보
SUPABASE_DATABASE_URL=postgresql://postgres.xqepeecuuquoamcvomsv:gudans10dkfk@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres

# Railway 연결 정보 (Supabase Direct Connection 사용)
DATABASE_URL=postgresql://postgres:gudans10dkfk@db.xqepeecuuquoamcvomsv.supabase.co:5432/postgres?sslmode=require
```

**변경 사항:**
- `postgres:@` → `postgres:gudans10dkfk@` (비밀번호 추가)
- `?sslmode=require` 추가 (SSL 필수)

### 방법 2: Supabase에서 비밀번호 확인

비밀번호를 모른다면:

1. Supabase → **"Settings"** → **"Database"**
2. **"Database password"** 섹션 확인
3. 비밀번호를 모른다면 **"Reset database password"** 클릭
4. 새 비밀번호 설정
5. `.env` 파일에 새 비밀번호 사용

## 최종 .env 파일 형식

```env
# Supabase 연결 정보 (Connection Pooling)
SUPABASE_DATABASE_URL=postgresql://postgres.xqepeecuuquoamcvomsv:gudans10dkfk@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres

# Railway 연결 정보 (Supabase Direct Connection - 로컬 개발용)
DATABASE_URL=postgresql://postgres:gudans10dkfk@db.xqepeecuuquoamcvomsv.supabase.co:5432/postgres?sslmode=require
```

**중요**: 
- `gudans10dkfk` 부분이 실제 비밀번호인지 확인
- 비밀번호가 다르다면 Supabase에서 확인 후 수정

