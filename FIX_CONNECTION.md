# Supabase 연결 오류 해결

`ENOTFOUND` 오류는 Supabase 호스트 이름을 찾을 수 없다는 의미입니다.

## 문제 원인

1. Connection String 형식이 잘못됨
2. Supabase 프로젝트가 일시 중지됨
3. 호스트 이름이 잘못 입력됨

## 해결 방법

### 1단계: Supabase Connection String 다시 확인

1. Supabase 대시보드 접속
2. **"Settings"** → **"Database"** 클릭
3. **"Connection string"** 섹션 찾기
4. **"URI"** 탭 클릭
5. 연결 문자열 복사

**올바른 형식:**
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
```

또는:

```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require
```

### 2단계: .env 파일 확인

`.env` 파일을 열어서 확인:

```env
SUPABASE_DATABASE_URL=postgresql://postgres:실제비밀번호@db.프로젝트ID.supabase.co:5432/postgres?sslmode=require
```

**확인 사항:**
- `[PASSWORD]` 부분이 실제 비밀번호로 교체되었는지
- `[PROJECT-REF]` 부분이 실제 프로젝트 ID인지
- 전체 URL이 따옴표 없이 입력되었는지

### 3단계: Supabase 프로젝트 상태 확인

1. Supabase 대시보드에서 프로젝트 상태 확인
2. 프로젝트가 일시 중지되었는지 확인
3. 필요시 프로젝트 재개

### 4단계: Connection String 형식 확인

Supabase는 두 가지 연결 방식이 있습니다:

**방식 1: Direct Connection (포트 5432)**
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require
```

**방식 2: Connection Pooling (포트 6543)**
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
```

**권장**: Direct Connection 사용 (포트 5432)

### 5단계: 테스트 연결

PowerShell에서 직접 테스트:

```powershell
# Node.js로 간단한 연결 테스트
node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.SUPABASE_DATABASE_URL});c.connect().then(()=>console.log('✅ 연결 성공')).catch(e=>console.error('❌ 연결 실패:',e.message)).finally(()=>c.end())"
```

## 빠른 해결 체크리스트

- [ ] Supabase → Settings → Database → Connection string → URI 확인
- [ ] `.env` 파일의 `SUPABASE_DATABASE_URL` 확인
- [ ] 비밀번호가 실제 비밀번호로 교체되었는지 확인
- [ ] 프로젝트 ID가 올바른지 확인
- [ ] `?sslmode=require`가 포함되어 있는지 확인
- [ ] Supabase 프로젝트가 활성 상태인지 확인

## 대안: Supabase SQL Editor 사용

연결이 계속 실패한다면:

1. Supabase → **"SQL Editor"** 클릭
2. 각 테이블별로 데이터 확인
3. 수동으로 데이터 추출 (데이터가 많지 않은 경우)

