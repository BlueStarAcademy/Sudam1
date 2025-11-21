# 로그인 및 Pooler 문제 해결

## 문제 1: 로그인 인증 실패
기존 사용자의 비밀번호가 `pbkdf2` 해시로 저장되어 있어 `bcrypt` 검증이 실패했습니다.

**해결**: 코드를 수정하여 두 방식을 모두 지원하도록 했습니다. 기존 관리자 비밀번호 `1217`로 로그인하면 자동으로 `bcrypt`로 마이그레이션됩니다.

## 문제 2: Prepared Statement 에러
```
prepared statement "s13" does not exist
```

이 에러는 **Transaction Pooler**를 사용할 때 발생합니다. Transaction Pooler는 PREPARE statements를 지원하지 않습니다.

**해결**: **Session Pooler**를 사용해야 합니다.

## .env 파일 수정

`.env` 파일의 `DATABASE_URL`을 다음과 같이 수정하세요:

```env
# Session Pooler 사용 (PREPARE statements 지원)
DATABASE_URL=postgresql://postgres.xqepeecuuquoamcvomsv:gudans10dkfk@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true
```

**중요 사항:**
- 호스트: `aws-1-ap-northeast-2.pooler.supabase.com` (pooler 포함)
- 포트: `6543` (Pooling 전용 포트)
- 사용자명: `postgres.xqepeecuuquoamcvomsv` (프로젝트 ID 포함)
- `?sslmode=require&pgbouncer=true` 추가

**Session Pooler vs Transaction Pooler:**
- **Session Pooler**: PREPARE statements 지원 ✅ (Prisma에 필요)
- **Transaction Pooler**: PREPARE statements 미지원 ❌

## 서버 재시작

`.env` 파일 수정 후 서버를 재시작하세요:

```powershell
npm start
```

## 로그인 테스트

1. 관리자 아이디: `푸른별바둑학원`
2. 비밀번호: `1217`
3. 로그인 시 자동으로 비밀번호가 `bcrypt`로 마이그레이션됩니다.

