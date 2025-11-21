# 로그인 500 에러 해결 방법

## 문제
- 로그인 시 500 Internal Server Error 발생
- 클라이언트에서 "Unexpected end of JSON input" 에러

## 원인
1. **데이터베이스 연결 실패** (가장 가능성 높음)
2. 서버가 실행되지 않음
3. `.env` 파일의 `DATABASE_URL` 설정 오류

## 해결 방법

### 1. 서버 콘솔 로그 확인
서버를 실행한 터미널에서 에러 메시지를 확인하세요:
- `Can't reach database server` → 데이터베이스 연결 실패
- `password authentication failed` → 비밀번호 오류
- 기타 Prisma 에러

### 2. `.env` 파일 확인
`.env` 파일이 다음과 같이 설정되어 있는지 확인:

```env
# Supabase Direct Connection (로컬 개발용)
DATABASE_URL=postgresql://postgres:gudans10dkfk@db.xqepeecuuquoamcvomsv.supabase.co:5432/postgres?sslmode=require
```

**중요 사항:**
- 비밀번호가 올바른지 확인 (`gudans10dkfk`)
- `?sslmode=require` 포함 여부 확인
- 포트가 `5432`인지 확인 (Connection Pooling URL의 `6543` 아님)

### 3. 서버 재시작
`.env` 파일을 수정한 후 서버를 재시작:

```powershell
# 서버 중지 (Ctrl+C)
# 서버 재시작
npm start
```

### 4. 데이터베이스 연결 테스트
서버 시작 시 다음과 같은 메시지가 나와야 합니다:
- `[Server] Database connected successfully`
- `[Server] Server running on port 4000`

에러 메시지가 나오면:
- `Error during server startup: Can't reach database server` → 네트워크/연결 문제
- `Error during server startup: password authentication failed` → 비밀번호 오류

### 5. Supabase 연결 확인
Supabase 대시보드에서:
1. **Settings** → **Database**
2. **Connection string** 확인
3. **Direct connection** (포트 5432) 사용
4. 비밀번호 확인 또는 재설정

## 디버깅 팁

### 서버 로그 확인
로그인 시도 시 서버 콘솔에 다음과 같은 로그가 나와야 합니다:
```
[/api/auth/login] Received request
[/api/auth/login] Attempting to get user credentials for: [username]
```

에러가 발생하면:
```
[/api/auth/login] Login error: [에러 메시지]
[/api/auth/login] Error stack: [스택 트레이스]
```

이 로그를 확인하면 정확한 원인을 파악할 수 있습니다.

