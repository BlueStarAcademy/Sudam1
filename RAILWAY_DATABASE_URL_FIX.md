# Railway DATABASE_URL 문제 해결

`railway run`을 사용해도 `postgres.railway.internal`을 찾을 수 없다면, Railway 환경 변수가 제대로 주입되지 않은 것입니다.

## 해결 방법

### 방법 1: Railway 대시보드에서 DATABASE_URL 확인

1. Railway 대시보드 접속
2. **"Postgres"** 서비스 클릭
3. **"Variables"** 탭 클릭
4. `DATABASE_URL` 변수 확인
5. 값이 `postgres.railway.internal`을 사용하는지 확인

### 방법 2: Railway CLI로 DATABASE_URL 확인

```powershell
# Postgres 서비스의 환경 변수 확인
railway variables --service Postgres
```

### 방법 3: 스크립트에서 직접 확인

스크립트가 Railway 환경 변수를 제대로 읽는지 확인하기 위해 디버그 출력 추가

### 방법 4: Railway PostgreSQL Public URL 사용

Railway PostgreSQL에 Public URL이 있다면:

1. Railway → **"Postgres"** 서비스 → **"Settings"** → **"Networking"**
2. **"Generate Domain"** 클릭
3. 생성된 Public URL 사용

예시:
```env
DATABASE_URL=postgresql://postgres:password@postgres-production.up.railway.app:5432/railway
```

## 확인

Railway CLI를 사용할 때는 Railway 환경 변수가 자동으로 주입되어야 합니다.

```powershell
# Railway 환경 변수 확인
railway run env | grep DATABASE_URL
```

또는:

```powershell
# Railway 환경에서 Node.js로 환경 변수 확인
railway run node -e "console.log(process.env.DATABASE_URL)"
```

