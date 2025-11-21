# .env 파일 수정 예시

## 현재 형식 (큰따옴표 사용 - 작동하지만 권장하지 않음)

```env
SUPABASE_DATABASE_URL="postgresql://postgres.xqepeecuuquoamcvomsv:gudans10dkfk@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres"
DATABASE_URL="postgresql://postgres:XfhEACpePdhsJdEGavgULnpMDDhmpKlR@postgres.railway.internal:5432/railway"
```

## 권장 형식 (따옴표 없이)

```env
SUPABASE_DATABASE_URL=postgresql://postgres.xqepeecuuquoamcvomsv:gudans10dkfk@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres
DATABASE_URL=postgresql://postgres:XfhEACpePdhsJdEGavgULnpMDDhmpKlR@postgres.railway.internal:5432/railway
```

## 수정 방법

1. `.env` 파일 열기
2. `SUPABASE_DATABASE_URL`과 `DATABASE_URL` 줄에서 큰따옴표(`"`) 제거
3. 파일 저장

## 확인

현재 설정이 올바른지 확인:
- ✅ Supabase Connection String: 올바름
- ✅ Railway DATABASE_URL: 올바름
- ⚠️ 큰따옴표: 제거 권장 (하지만 작동할 수도 있음)

