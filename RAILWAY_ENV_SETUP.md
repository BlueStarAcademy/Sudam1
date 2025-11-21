# Railway 환경 변수 설정

Railway CLI를 사용할 때는 Railway의 환경 변수를 사용합니다. `.env` 파일이 아닙니다.

## 해결 방법

### 방법 1: Railway 환경 변수에 SUPABASE_DATABASE_URL 추가

1. Railway 대시보드 접속
2. **"Postgres"** 서비스 → **"Variables"** 탭
3. **"+ New Variable"** 클릭
4. 다음 입력:
   - Name: `SUPABASE_DATABASE_URL`
   - Value: `postgresql://postgres.xqepeecuuquoamcvomsv:gudans10dkfk@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres`
5. **"Add"** 클릭

### 방법 2: Railway CLI로 환경 변수 설정

```powershell
# Postgres 서비스에 환경 변수 추가
railway variables set SUPABASE_DATABASE_URL="postgresql://postgres.xqepeecuuquoamcvomsv:gudans10dkfk@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres" --service Postgres
```

### 방법 3: 스크립트 수정하여 로컬 .env 파일 사용

Railway 환경에서도 로컬 `.env` 파일을 읽도록 스크립트 수정

## 권장: 방법 1 (Railway 대시보드 사용)

가장 간단하고 확실한 방법입니다.

