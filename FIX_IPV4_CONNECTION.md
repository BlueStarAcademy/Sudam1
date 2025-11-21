# IPv4 연결 문제 해결

## 문제 원인
Direct Connection (`db.xqepeecuuquoamcvomsv.supabase.co:5432`)이 **IPv4와 호환되지 않습니다**.

Supabase 대시보드에서도 다음 경고가 표시됩니다:
- "Not IPv4 compatible"
- "Use Session Pooler if on a IPv4 network"

## 해결 방법: Session Pooler 사용

Windows 환경에서는 IPv4 네트워크를 사용하므로 **Session Pooler**를 사용해야 합니다.

### .env 파일 수정

`.env` 파일의 `DATABASE_URL`을 다음과 같이 수정:

```env
# Session Pooler 사용 (IPv4 호환, 포트 6543)
DATABASE_URL=postgresql://postgres.xqepeecuuquoamcvomsv:gudans10dkfk@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?sslmode=require
```

**중요 사항:**
- 호스트: `aws-1-ap-northeast-2.pooler.supabase.com` (pooler 포함)
- 포트: `6543` (Pooling 전용 포트)
- 사용자명: `postgres.xqepeecuuquoamcvomsv` (프로젝트 ID 포함)
- 비밀번호: `gudans10dkfk` (실제 비밀번호로 변경)
- `?sslmode=require` 필수

### Session Pooler vs Transaction Pooler

| 항목 | Session Pooler | Transaction Pooler |
|------|----------------|-------------------|
| 용도 | Direct Connection 대안 (IPv4 네트워크) | 서버리스 함수 (짧은 연결) |
| PREPARE 지원 | ✅ 지원 | ❌ 미지원 |
| 권장 상황 | 로컬 개발, VM, 컨테이너 | 서버리스 함수 |

**로컬 개발에는 Session Pooler를 권장합니다.**

### 서버 재시작

`.env` 파일 수정 후 서버 재시작:

```powershell
npm start
```

### 비밀번호 확인

비밀번호가 맞는지 확인:
1. Supabase 대시보드 → **Settings** → **Database**
2. **Reset your database password** 섹션 확인
3. 비밀번호를 모른다면 **Database Settings** 링크 클릭하여 재설정

### 연결 확인

서버 시작 시 다음 메시지가 나와야 합니다:
```
[Server] Database connected successfully
```

에러가 계속되면:
1. 비밀번호 재확인
2. `.env` 파일의 `DATABASE_URL` 형식 확인
3. `?sslmode=require` 포함 여부 확인

