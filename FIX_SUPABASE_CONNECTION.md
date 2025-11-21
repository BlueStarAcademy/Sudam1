# Supabase 연결 문제 해결

## 현재 문제
```
Can't reach database server at `db.xqepeecuuquoamcvomsv.supabase.co:5432`
```

## 해결 방법

### 방법 1: Supabase에서 올바른 Connection String 확인

1. **Supabase 대시보드 접속**
   - https://supabase.com/dashboard
   - 프로젝트 선택

2. **Settings** → **Database** 이동

3. **Connection string** 섹션 확인
   - **Connection pooling** 탭 선택
   - **Session mode** 선택
   - **URI** 복사

4. **올바른 형식 예시:**
```
postgresql://postgres.xqepeecuuquoamcvomsv:[YOUR-PASSWORD]@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?sslmode=require
```

### 방법 2: Direct Connection 사용 (포트 5432)

**주의**: Direct Connection은 연결 수 제한이 있습니다.

1. **Settings** → **Database**
2. **Connection string** → **Direct connection** 탭
3. **URI** 복사

**형식:**
```
postgresql://postgres.xqepeecuuquoamcvomsv:[YOUR-PASSWORD]@aws-1-ap-northeast-2.compute.amazonaws.com:5432/postgres?sslmode=require
```

### 방법 3: .env 파일 수정

`.env` 파일을 다음과 같이 수정:

```env
# Connection Pooling 사용 (권장)
DATABASE_URL=postgresql://postgres.xqepeecuuquoamcvomsv:gudans10dkfk@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?sslmode=require

# 또는 Direct Connection 사용
# DATABASE_URL=postgresql://postgres.xqepeecuuquoamcvomsv:gudans10dkfk@aws-1-ap-northeast-2.compute.amazonaws.com:5432/postgres?sslmode=require
```

**중요 사항:**
- `?sslmode=require` 필수
- 비밀번호 확인 (`gudans10dkfk`가 맞는지)
- 호스트명이 올바른지 확인

### 방법 4: 네트워크 제한 확인

Supabase에서 IP 제한이 설정되어 있을 수 있습니다:

1. **Settings** → **Database**
2. **Network Restrictions** 확인
3. IP 제한이 있다면:
   - 현재 IP 추가
   - 또는 제한 해제 (개발 중)

### 방법 5: Supabase 프로젝트 상태 확인

1. Supabase 대시보드에서 프로젝트가 **Active** 상태인지 확인
2. 프로젝트가 일시 중지되었다면 재개

## 테스트

서버 재시작 후 다음 메시지가 나와야 합니다:
```
[Server] Database connected successfully
```

에러가 계속되면:
1. Supabase 대시보드에서 **Connection string** 다시 확인
2. 비밀번호 재설정 (Settings → Database → Reset database password)
3. `.env` 파일의 `DATABASE_URL` 업데이트
