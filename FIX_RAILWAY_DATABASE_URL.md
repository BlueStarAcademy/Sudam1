# Railway 데이터베이스 연결 오류 해결

## 문제
```
Can't reach database server at `db.xqepeecuuquoamcvomsv.supabase.co:6543`
```

**원인**: 호스트명과 포트가 맞지 않습니다.
- 호스트명 `db.xqepeecuuquoamcvomsv.supabase.co`는 Direct Connection용 (포트 5432)
- 포트 `6543`은 Connection Pooling용 (호스트명은 `*.pooler.supabase.com`)

## 해결 방법

### Railway 환경 변수 수정

1. **Railway 대시보드 접속**
   - 프로젝트 → Backend 서비스 선택

2. **Variables 탭 클릭**

3. **DATABASE_URL 수정**

   **현재 (잘못된 형식):**
   ```
   postgresql://postgres:password@db.xqepeecuuquoamcvomsv.supabase.co:6543/postgres
   ```

   **올바른 형식 (Session Pooler):**
   ```
   postgresql://postgres.xqepeecuuquoamcvomsv:gudans10dkfk@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true
   ```

   **중요 사항:**
   - 호스트명: `aws-1-ap-northeast-2.pooler.supabase.com` (pooler 포함)
   - 포트: `6543` (Connection Pooling 포트)
   - 사용자명: `postgres.xqepeecuuquoamcvomsv` (프로젝트 ID 포함)
   - 비밀번호: `gudans10dkfk` (실제 비밀번호)
   - `?sslmode=require&pgbouncer=true` 필수

4. **변수 저장 후 자동 재배포**

   Railway가 자동으로 재배포를 시작합니다.

5. **배포 로그 확인**

   Deploy Logs에서 다음 메시지 확인:
   ```
   [DB] Database initialized successfully
   [Server] Server listening on port 4000
   ```

## Supabase에서 올바른 Connection String 확인

Railway에서 연결이 계속 실패하면:

1. **Supabase 대시보드 접속**
   - Settings → Database

2. **Connection string** 섹션
   - **Connection pooling** 탭 선택
   - **Session mode** 선택
   - **URI** 복사

3. **Railway에 붙여넣기**

   복사한 전체 URL을 Railway의 `DATABASE_URL`에 설정

## 대안: Direct Connection 사용 (비권장)

만약 Session Pooler가 작동하지 않으면 Direct Connection을 사용할 수 있지만, IPv4 호환 문제가 있을 수 있습니다:

```
postgresql://postgres.xqepeecuuquoamcvomsv:gudans10dkfk@aws-1-ap-northeast-2.compute.amazonaws.com:5432/postgres?sslmode=require
```

**주의**: Direct Connection은 연결 수 제한이 있고, IPv4 호환 문제가 있을 수 있습니다.

## 확인 사항

배포 후 다음을 확인하세요:

1. **Health Check**
   ```
   https://sudam.up.railway.app/api/health
   ```

2. **배포 로그**
   - 데이터베이스 연결 성공 메시지
   - 서버 시작 메시지

3. **에러 메시지**
   - 여전히 연결 오류가 있으면 Railway 로그 확인
   - Supabase Network Restrictions 확인

