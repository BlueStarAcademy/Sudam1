# .env 파일 형식 가이드

## 올바른 형식

### ✅ 권장: 따옴표 없이 사용

```env
SUPABASE_DATABASE_URL=postgresql://postgres.xqepeecuuquoamcvomsv:실제비밀번호@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres
DATABASE_URL=postgresql://postgres:password@postgres.railway.internal:5432/railway
```

### ✅ 가능: 큰따옴표 사용

```env
SUPABASE_DATABASE_URL="postgresql://postgres.xqepeecuuquoamcvomsv:실제비밀번호@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres"
DATABASE_URL="postgresql://postgres:password@postgres.railway.internal:5432/railway"
```

### ✅ 가능: 작은따옴표 사용

```env
SUPABASE_DATABASE_URL='postgresql://postgres.xqepeecuuquoamcvomsv:실제비밀번호@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres'
DATABASE_URL='postgresql://postgres:password@postgres.railway.internal:5432/railway'
```

## 중요: 비밀번호 교체

Supabase Connection String에서:
```
postgresql://postgres.xqepeecuuquoamcvomsv:[YOUR-PASSWORD]@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres
```

**`[YOUR-PASSWORD]` 부분을 실제 비밀번호로 교체해야 합니다!**

예시:
```env
SUPABASE_DATABASE_URL=postgresql://postgres.xqepeecuuquoamcvomsv:MyPassword123@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres
```

## 비밀번호 확인/재설정

비밀번호를 모른다면:

1. Supabase → **"Settings"** → **"Database"**
2. **"Database password"** 섹션에서 **"Reset database password"** 클릭
3. 새 비밀번호 설정
4. 설정한 비밀번호를 Connection String에 사용

## .env 파일 예시

```env
# Supabase 연결 정보
SUPABASE_DATABASE_URL=postgresql://postgres.xqepeecuuquoamcvomsv:실제비밀번호@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres

# Railway 연결 정보
DATABASE_URL=postgresql://postgres:password@postgres.railway.internal:5432/railway

# 기타 환경 변수
NODE_ENV=development
```

## 주의사항

1. **공백 없이**: `KEY=value` 형식 (등호 앞뒤 공백 없음)
2. **주석**: `#`로 시작하는 줄은 주석
3. **특수문자**: 비밀번호에 특수문자가 있으면 URL 인코딩 필요할 수 있음
4. **따옴표**: 일반적으로 필요 없지만, 값에 공백이 있으면 사용 가능

## 테스트

`.env` 파일을 저장한 후:

```powershell
node scripts/migrateFromSupabase.js
```

연결이 성공하면:
```
✅ Supabase 연결 성공
```

