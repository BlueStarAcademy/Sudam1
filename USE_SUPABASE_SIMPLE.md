# Supabase 계속 사용하기 (가장 간단한 방법)

마이그레이션 없이 Supabase를 그대로 사용할 수 있습니다!

## 설정 방법

### 1단계: Railway Backend 서비스의 DATABASE_URL 변경

1. Railway 대시보드 접속
2. **"Sudam1"** 서비스 클릭
3. **"Variables"** 탭 클릭
4. `DATABASE_URL` 변수 찾기
5. **편집** 클릭하여 Supabase Connection String으로 변경

**Supabase Connection String 확인:**
1. Supabase → **"Settings"** → **"Database"**
2. **"Connection string"** → **"URI"** 탭
3. 전체 연결 문자열 복사
4. Railway의 `DATABASE_URL`에 붙여넣기

**형식:**
```
postgresql://postgres.xqepeecuuquoamcvomsv:gudans10dkfk@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres
```

### 2단계: 변경사항 적용

1. Railway에서 **"Apply changes"** 또는 **"Deploy"** 클릭
2. 재배포 완료 대기

### 3단계: 완료!

이제 Railway Backend가 Supabase 데이터베이스를 사용합니다.

## 장점

- ✅ 마이그레이션 불필요
- ✅ 기존 데이터 그대로 사용
- ✅ 추가 작업 없음
- ✅ 즉시 사용 가능

## 비용

- Supabase 무료 플랜: 계속 사용 가능
- Railway: Backend 서비스만 사용
- **총 비용**: Railway만 ($5-10/월)

## 다음 단계

1. Railway → **"Sudam1"** → **"Variables"** → `DATABASE_URL` 수정
2. Supabase Connection String 붙여넣기
3. **"Apply changes"** 클릭
4. 배포 완료 후 테스트

이게 훨씬 간단합니다!

