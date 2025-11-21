# Connection Pooling 사용 (권장)

## 문제
Direct Connection (`aws-1-ap-northeast-2.compute.amazonaws.com:5432`)에 연결할 수 없습니다.

## 해결 방법: Connection Pooling 사용

Connection Pooling은 더 안정적이고 로컬에서도 잘 작동합니다.

### 1. Supabase에서 Connection Pooling URL 확인

1. Supabase 대시보드 → **Settings** → **Database**
2. **Connection string** 섹션
3. **Connection pooling** 탭 선택
4. **Session mode** 선택
5. **URI** 복사

### 2. .env 파일 수정

`.env` 파일의 `DATABASE_URL`을 다음과 같이 수정:

```env
# Connection Pooling 사용 (포트 6543)
DATABASE_URL=postgresql://postgres.xqepeecuuquoamcvomsv:gudans10dkfk@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?sslmode=require
```

**중요 사항:**
- 호스트: `aws-1-ap-northeast-2.pooler.supabase.com` (pooler 포함)
- 포트: `6543` (Pooling 전용 포트)
- 사용자명: `postgres.xqepeecuuquoamcvomsv` (프로젝트 ID 포함)
- `?sslmode=require` 필수

### 3. Connection Pooling vs Direct Connection

| 항목 | Connection Pooling | Direct Connection |
|------|-------------------|-------------------|
| 포트 | 6543 | 5432 |
| 호스트 | `*.pooler.supabase.com` | `*.compute.amazonaws.com` |
| 연결 수 제한 | 더 많음 | 제한적 |
| 로컬 접근 | ✅ 권장 | ⚠️ 제한적 |
| 네트워크 제한 | 덜 민감 | 더 민감 |

### 4. 서버 재시작

`.env` 파일 수정 후 서버 재시작:

```powershell
npm start
```

### 5. 여전히 연결되지 않으면

1. **Supabase 프로젝트 상태 확인**
   - 프로젝트가 Active 상태인지 확인
   - 일시 중지되었다면 재개

2. **Network Restrictions 확인**
   - Settings → Database → Network Restrictions
   - IP 제한이 있다면 현재 IP 추가
   - 또는 개발 중에는 제한 해제

3. **비밀번호 확인**
   - Settings → Database → Database password
   - 비밀번호가 맞는지 확인
   - 필요시 재설정

4. **Connection String 다시 복사**
   - Supabase 대시보드에서 최신 Connection String 복사
   - `.env` 파일에 정확히 붙여넣기

