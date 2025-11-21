# 로컬에서 Supabase 연결 문제 해결

`Can't reach database server at db.xqepeecuuquoamcvomsv.supabase.co:5432` 오류 해결 방법

## 가능한 원인

1. **Supabase 프로젝트 일시 중지**
2. **Network Restrictions 설정**
3. **Connection String 형식 문제**
4. **비밀번호 오류**

## 해결 방법

### 1단계: Supabase 프로젝트 상태 확인

1. Supabase 대시보드 접속
2. 프로젝트 상태 확인
3. 프로젝트가 일시 중지되었는지 확인
4. 필요시 프로젝트 재개

### 2단계: Network Restrictions 확인

1. Supabase → **"Settings"** → **"Database"**
2. **"Network Restrictions"** 섹션 확인
3. **"Add restriction"** 버튼이 있다면:
   - 로컬 IP 주소 추가
   - 또는 **"Allow all IPs"** 설정 (개발 환경)

**중요**: Network Restrictions가 설정되어 있으면 허용된 IP만 접근 가능합니다.

### 3단계: Connection String 재확인

1. Supabase → **"Settings"** → **"Database"**
2. **"Connection string"** → **"URI"** 탭
3. **"Session mode"** 선택 (Direct connection)
4. 전체 연결 문자열 복사
5. `.env` 파일에 정확히 붙여넣기

**올바른 형식:**
```
postgresql://postgres:비밀번호@db.xqepeecuuquoamcvomsv.supabase.co:5432/postgres?sslmode=require
```

### 4단계: 비밀번호 확인

1. Supabase → **"Settings"** → **"Database"**
2. **"Database password"** 섹션 확인
3. 비밀번호를 모른다면 **"Reset database password"** 클릭
4. 새 비밀번호를 Connection String에 사용

## 빠른 확인

Supabase 대시보드에서:
1. 프로젝트가 **활성 상태**인지 확인
2. **"Network Restrictions"**에 제한이 있는지 확인
3. **Connection string**을 다시 복사하여 `.env`에 붙여넣기

## 대안: Railway에서만 Supabase 사용

로컬 개발 환경에서는:
- Railway Backend만 Supabase 사용
- 로컬에서는 개발용 SQLite 사용 (선택적)

또는:
- Railway에 배포 후 테스트
- 로컬에서는 Railway Backend API 사용

