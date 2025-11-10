# Supabase 연결 및 Prisma 마이그레이션 가이드

## 1. Supabase 준비
- Supabase 프로젝트를 생성하고 `Settings > Database`에서 제공되는 `Connection string`(URI)을 확인합니다.
- 예시:
  ```
  postgresql://postgres:<비밀번호>@db.xqepeecuuquoamcvomsv.supabase.co:5432/postgres?schema=public
  ```
- 보안상 실제 비밀번호가 포함된 URI는 깃에 커밋하지 말고, `.env` 등의 비공개 파일에만 저장하세요.

## 2. 환경 변수 설정
1. 루트 경로의 `.env` 또는 배포용 `deploy.env`에 `DATABASE_URL`을 추가합니다.
   ```bash
   # .env (개발 환경)
   DATABASE_URL="postgresql://postgres:<비밀번호>@db.xqepeecuuquoamcvomsv.supabase.co:5432/postgres?schema=public"
   ```
2. Supabase는 기본적으로 `public` 스키마를 사용하지만, Prisma 권장 사항에 따라 `?schema=public` 쿼리 파라미터를 붙이는 것을 추천합니다.
3. 팀원 공유용으로는 `env.postgres.example` 또는 `deploy.env.example`의 빈 `DATABASE_URL` 항목을 복사해 사용하도록 안내하세요.

## 3. Prisma 클라이언트 생성
```bash
npm run prisma:generate
```
- 위 명령은 `prisma/schema.prisma` 기반으로 Prisma 클라이언트를 생성하여 `generated/prisma` 경로에 출력합니다.
- 새로운 스키마 변경 사항이 발생할 때마다 다시 실행해야 합니다.

## 4. 마이그레이션 적용
### 4.1 운영/테스트 환경
```bash
npm run prisma:migrate:deploy
```
- 저장소에 포함된 `prisma/migrations/0001_init_schema`를 Supabase(PostgreSQL)에 적용합니다.

### 4.2 로컬 개발용
```bash
npm run prisma:migrate:dev -- --name <migration_name>
```
- 새로운 스키마 변경을 개발할 때 사용합니다.
- 명령 실행 후 생성된 SQL을 코드 리뷰 절차에 포함시키세요.

## 5. 데이터 마이그레이션
- 기존 SQLite 데이터를 Supabase로 옮기는 절차는 `docs/db-migration-plan.md`를 참고하세요.
- 핵심 단계:
  1. SQLite에서 유저 데이터를 JSON 형태로 추출.
  2. Prisma 트랜잭션을 이용해 `User`, `UserInventory`, `UserEquipment` 등 테이블에 삽입.
  3. 마이그레이션 완료 후 주요 유저 샘플에 대해 데이터 정합성 검증.

## 6. 애플리케이션 코드 전환 시 주의사항
- 현재 서버 로직(`server/db.ts` 등)은 SQLite에 의존하므로, Prisma 기반 레포지토리(`server/prisma/*`)로 점진적 교체가 필요합니다.
- 교체 작업 중에는 동일 비즈니스 로직이 두 번 존재하지 않도록 기존 함수와 새 함수를 매핑하는 어댑터를 도입하는 것이 좋습니다.
- 트랜잭션 처리 시 `server/prisma/transaction.ts`에 정의된 `PrismaTransactionClient`를 활용하면 공통 패턴을 유지할 수 있습니다.

---
- 문의: #backend-db-migration Slack 채널 또는 Notion 문서 공유 페이지를 참고하세요.

