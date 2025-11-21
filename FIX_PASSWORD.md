# Supabase 비밀번호 인증 오류 해결

`password authentication failed` 오류는 비밀번호가 잘못되었다는 의미입니다.

## 해결 방법

### 방법 1: Supabase에서 비밀번호 확인/재설정

1. Supabase 대시보드 접속
2. **"Settings"** → **"Database"** 클릭
3. **"Database password"** 섹션 확인
4. 비밀번호를 모른다면 **"Reset database password"** 클릭
5. 새 비밀번호 설정
6. 설정한 비밀번호를 `.env` 파일에 업데이트

### 방법 2: Connection String에서 비밀번호 확인

Supabase Connection String 형식:
```
postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres?sslmode=require
```

**중요**: `[PASSWORD]` 부분을 실제 비밀번호로 교체해야 합니다.

### 방법 3: Connection String 전체 다시 복사

1. Supabase → **"Settings"** → **"Database"**
2. **"Connection string"** → **"URI"** 탭
3. **전체 연결 문자열 복사** (비밀번호 포함)
4. `.env` 파일의 `SUPABASE_DATABASE_URL`에 붙여넣기

**참고**: Supabase Connection String에는 이미 비밀번호가 포함되어 있습니다.

## .env 파일 확인

`.env` 파일을 열어서 확인:

```env
SUPABASE_DATABASE_URL=postgresql://postgres:실제비밀번호@db.xxx.supabase.co:5432/postgres?sslmode=require
```

**확인 사항:**
- `[PASSWORD]` 또는 `[YOUR-PASSWORD]` 같은 플레이스홀더가 남아있지 않은지
- 비밀번호에 특수문자가 있다면 URL 인코딩이 필요한지
- 전체 URL이 따옴표 없이 입력되었는지

## 비밀번호에 특수문자가 있는 경우

비밀번호에 `@`, `:`, `/`, `?`, `#`, `[`, `]` 같은 특수문자가 있다면 URL 인코딩이 필요합니다:

- `@` → `%40`
- `:` → `%3A`
- `/` → `%2F`
- `?` → `%3F`
- `#` → `%23`
- `[` → `%5B`
- `]` → `%5D`

## 빠른 해결

1. Supabase → **"Settings"** → **"Database"**
2. **"Reset database password"** 클릭
3. 간단한 비밀번호 설정 (특수문자 최소화)
4. 새 비밀번호를 `.env` 파일에 업데이트
5. 스크립트 다시 실행

## 테스트

비밀번호를 업데이트한 후:

```powershell
node scripts/migrateFromSupabase.js
```

연결이 성공하면 다음 메시지가 나타납니다:
```
✅ Supabase 연결 성공
```

